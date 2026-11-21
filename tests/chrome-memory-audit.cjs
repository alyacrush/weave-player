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

async function main() {
	const context = await chromium.launchPersistentContext(profile, {
		channel: 'chromium',
		headless: true,
		ignoreDefaultArgs: ['--disable-extensions'],
		args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension,
			'--autoplay-policy=no-user-gesture-required'],
	});
	try {
		const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout: 10000});
		await worker.evaluate(() => chrome.storage.local.set({
			чВерсияНастроек: 2,
			чРежимПлеера: 0,
			лАвтоперенаправлениеЗамечено: true,
		}));
		const page = context.pages()[0];
		const cdp = await context.newCDPSession(page);
		const results = [];
		let channel;
		for (const name of ['zizaran', 'nix', 'captainlance9']) {
			try {
				await page.goto('https://www.twitch.tv/' + name + '?weave=0', {waitUntil:'domcontentloaded', timeout:18000});
				await playing(page, nativeVideo, 16000);
				channel = name;
				break;
			} catch {
				console.log('Native startup unavailable: ' + name);
			}
		}
		assert.ok(channel, 'native playback starts on a public channel');

		async function sample(mode, index, frame) {
			const heap = await cdp.send('Runtime.getHeapUsage');
			const dom = await cdp.send('Memory.getDOMCounters');
			const snapshot = {
				channel, mode, index, ...processMemory(),
				hostJsMiB: Math.round(heap.usedSize / 1048576),
				hostDocuments: dom.documents,
				hostNodes: dom.nodes,
				iframes: page.frames().filter(frame => frame.url().startsWith('chrome-extension:') && frame.url().includes('player.html')).length,
				twitch: await videoStats(page, nativeVideo),
				weave: frame ? await videoStats(frame, weaveVideo) : null,
			};
			results.push(snapshot);
			console.log('MEMORY ' + JSON.stringify(snapshot));
		}
		async function series(mode, count, frame) {
			for (let i=0; i<count; i++) {
				if (i) await sleep(15000);
				await sample(mode, i, frame);
			}
		}

		await series('native', 4);
		await page.locator('[data-weave-mode="1"]').click({timeout: 12000});
		await page.locator('[data-weave-diagnostic="playing"]').waitFor({timeout: 25000});
		const embedded = page.frames().find(frame => frame.url().startsWith('chrome-extension:') && frame.url().includes('player.html'));
		await playing(embedded, weaveVideo, 15000);
		await series('embedded', 6, embedded);

		const restore = page.getByRole('button', {name: /restore twitch player/i});
		await restore.click({timeout: 10000});
		await page.locator('[data-weave-diagnostic]').waitFor({state:'detached'});
		await series('restored', 3);
		for (let i=0; i<4; i++) {
			await page.locator('[data-weave-mode="1"]').click({timeout: 10000});
			await page.locator('[data-weave-diagnostic="playing"]').waitFor({timeout: 22000});
			await restore.click({timeout: 10000});
			await page.locator('[data-weave-diagnostic]').waitFor({state:'detached'});
			await sleep(2500);
			await cdp.send('HeapProfiler.collectGarbage');
			await sample('cycle-restored', i);
			assert.equal(results.at(-1).iframes, 0);
		}
	} finally {
		await context.close();
	}
}

main().catch(error => {
	console.error(error.message);
	process.exitCode = 1;
});
