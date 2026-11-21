'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {setTimeout: sleep} = require('node:timers/promises');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE);
const profile = path.join(process.env.RUNNER_TEMP, 'memory-profile');
const extension = process.argv[2];
const nativeVideo = '[data-a-target="video-player"] video';
const weaveVideo = '#глаз';

function processMemory() {
	const processes = new Map();
	const roots = [];
	for (const pid of fs.readdirSync('/proc').filter(name => /^\d+$/.test(name))) {
		try {
			const info = fs.readFileSync('/proc/' + pid + '/status', 'utf8');
			const args = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8').split('\0');
			const parent = info.match(/^PPid:\s+(\d+)/m)?.[1];
			if (args.includes('--user-data-dir=' + profile) && !args.some(arg => arg.startsWith('--type='))) roots.push(pid);
			processes.set(pid, parent);
		} catch {}
	}
	function descendants(pid) {
		return [pid, ...[...processes].filter(([, parent]) => parent === pid).flatMap(([child]) => descendants(child))];
	}
	let total = 0;
	const pids = [...new Set(roots.flatMap(descendants))];
	for (const pid of pids) {
		try {
			const item = fs.readFileSync('/proc/' + pid + '/smaps_rollup', 'utf8');
			total += Number(item.match(/^Pss:\s+(\d+)/m)?.[1] ?? 0);
		} catch {}
	}
	assert.ok(total > 0, 'access to Chrome process PSS');
	return {chromePssMiB: Math.round(total / 1024), chromeProcesses: pids.length};
}

async function videoStats(frame, selector) {
	return frame.evaluate(selector => {
		const video = document.querySelector(selector);
		if (!video) return null;
		const time = video.currentTime;
		let past = 0, ahead = 0;
		for (let i = 0; i < video.buffered.length; i++) {
			const start = video.buffered.start(i);
			const end = video.buffered.end(i);
			past += Math.max(0, Math.min(time, end) - start);
			ahead += Math.max(0, end - Math.max(time, start));
		}
		return {
			time: Math.round(time),
			past: Math.round(past),
			ahead: Math.round(ahead),
			resolution: video.videoWidth + 'x' + video.videoHeight,
			frames: video.getVideoPlaybackQuality().totalVideoFrames,
			paused: video.paused,
		};
	}, selector);
}

async function playing(frame, selector, timeout) {
	await frame.waitForFunction(selector => {
		const video = document.querySelector(selector);
		return video?.videoWidth > 0 && !video.paused && video.played.length > 0 &&
			video.played.end(0) - video.played.start(0) > 0.5;
	}, selector, {timeout});
}

const mode = process.env.WEAVE_MODE;
const replay = Number(process.env.WEAVE_REPLAY);
const channel = process.env.WEAVE_CHANNEL;
const quality = '720p60';

async function setTwitchQuality(page) {
	const settings = page.locator('[data-a-target="video-player"] [data-a-target="player-settings-button"]:visible').first();
	await page.locator('[data-a-target="video-player"]').hover();
	await settings.click({timeout:10000});
	const menu = page.locator('[data-a-target="player-settings-menu-item-quality"]:visible').first();
	if (await menu.count() === 1) await menu.click();
	else await page.getByText('Quality', {exact:true}).click({timeout:10000});
	await page.getByText(/^720p60(?:\s*\(.*\))?$/i).filter({visible:true}).first().click({timeout:10000});
}

function median(values) {
	const sorted = [...values].sort((a,b) => a-b);
	return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
}

async function main() {
	assert.match(mode, /^(native|embedded|standalone)$/);
	const args = ['--autoplay-policy=no-user-gesture-required'];
	if (mode !== 'native') args.push('--disable-extensions-except=' + extension, '--load-extension=' + extension);
	const context = await chromium.launchPersistentContext(profile, {
		channel: 'chromium',
		headless: true,
		ignoreDefaultArgs: mode === 'native' ? [] : ['--disable-extensions'],
		args,
	});
	try {
		const page = context.pages()[0];
		let extensionOrigin;
		if (mode !== 'native') {
			const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout:10000});
			extensionOrigin = 'chrome-extension://' + new URL(worker.url()).hostname;
			await worker.evaluate(({replay, quality}) => chrome.storage.local.set({
				чВерсияНастроек: 2,
				чРежимПлеера: 0,
				лАвтоперенаправлениеЗамечено: true,
				чДлительностьПовтора2: replay,
				сНазваниеВарианта: quality,
			}), {replay, quality});
		}
		const channelPage = 'https://www.twitch.tv/' + channel + '?weave=0';
		const videoSelector = mode === 'native' ? nativeVideo : weaveVideo;
		let videoPage = page;
		if (mode === 'standalone') {
			await page.goto(extensionOrigin + '/player.html?channel=' + channel, {waitUntil:'domcontentloaded', timeout:20000});
		} else {
			await page.goto(channelPage, {waitUntil:'domcontentloaded', timeout:20000});
			if (mode === 'native') {
				await playing(page, nativeVideo, 30000);
				await setTwitchQuality(page);
			} else {
				await page.locator('[data-weave-mode="1"]').click({timeout:20000});
				await page.locator('[data-weave-diagnostic="playing"]').waitFor({timeout:30000});
				videoPage = page.frames().find(frame => frame.url().startsWith(extensionOrigin + '/player.html'));
			}
		}
		await playing(videoPage, videoSelector, 30000);
		await videoPage.waitForFunction(selector => {
			const video = document.querySelector(selector);
			return video?.videoWidth === 1280 && video.videoHeight === 720;
		}, videoSelector, {timeout:30000});
		if (mode !== 'native') {
			const selected = await videoPage.locator('#варианттрансляции').evaluate(select => select.selectedOptions[0]?.textContent);
			assert.match(selected || '', /720p60/i, 'Weave selected the fixed 720p60 variant');
		}
		await videoPage.locator(videoSelector).evaluate(video => {
			let waitingAt;
			window.weaveAuditPlayback = {stalls:0, stalledMs:0};
			video.addEventListener('waiting', () => { waitingAt ??= performance.now(); });
			video.addEventListener('playing', () => {
				if (waitingAt === undefined) return;
				window.weaveAuditPlayback.stalledMs += performance.now() - waitingAt;
				window.weaveAuditPlayback.stalls++;
				waitingAt = undefined;
			});
		});
		const cdp = await context.newCDPSession(page);
		const measurements = [];
		let previous;
		for (let index=0; index<=10; index++) {
			if (index) await sleep(60000);
			const video = await videoStats(videoPage, videoSelector);
			assert.equal(video?.resolution, '1280x720', 'resolution changes invalidate the comparison');
			const fps = previous && video.time > previous.time
				? Math.round((video.frames - previous.frames) / (video.time - previous.time))
				: null;
			const heap = await cdp.send('Runtime.getHeapUsage');
			const stalls = await videoPage.evaluate(() => window.weaveAuditPlayback);
			const row = {
				mode, replay, channel, seconds:index * 60,
				...processMemory(), hostJsMiB:Math.round(heap.usedSize / 1048576),
				...video, fps, stalls:stalls.stalls, stalledMs:Math.round(stalls.stalledMs)
			};
			measurements.push(row);
			console.log('MATCHED ' + JSON.stringify(row));
			previous = video;
		}
		const measuredFps = median(measurements.slice(1).map(row => row.fps).filter(Number.isFinite));
		assert.ok(measuredFps >= 55 && measuredFps <= 66, 'measured FPS must match 60 fps, got ' + measuredFps);
		const steady = measurements.filter(row => row.seconds >= 240);
		const summary = {
			mode, replay, channel, resolution:'1280x720', measuredFps,
			medianMiB:median(steady.map(row => row.chromePssMiB)),
			peakMiB:Math.max(...measurements.map(row => row.chromePssMiB)),
			medianReplaySeconds:median(steady.map(row => row.past)),
			medianAheadSeconds:median(steady.map(row => row.ahead)),
			stalls:measurements.at(-1).stalls, stalledMs:measurements.at(-1).stalledMs,
		};
		if (mode === 'embedded') {
			await page.getByRole('button', {name:/restore twitch player/i}).click();
			await page.locator('[data-weave-diagnostic]').waitFor({state:'detached'});
		} else {
			await page.goto('about:blank');
		}
		await sleep(10000);
		summary.afterMiB = processMemory().chromePssMiB;
		console.log('SUMMARY ' + JSON.stringify(summary));
		fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### ' + mode + ' / replay ' + replay + ' seconds\n\n' + JSON.stringify(summary) + '\n');
	} finally {
		await context.close();
	}
}

main().catch(error => {
	console.error(error.stack);
	process.exitCode = 1;
});
