'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const channels = (process.env.WEAVE_LIVE_CHANNELS || 'stariy_bog,madarapoe').split(',');
assert.ok(channels.length <= 3 && channels.every(name => /^[a-zA-Z0-9_]{1,25}$/.test(name)));
const output = path.resolve('dist/live-twitch');
fs.mkdirSync(output, {recursive: true});

// A disposable, signed-out browser is used. Never store request bodies, cookies,
// access tokens, full network URLs, or raw player journals in the artifact.
function safeMessage(value) {
	return String(value).replace(/https?:\/\/[^\s"'<>]+/g, '[network URL]')
		.replace(/chrome-extension:\/\/[^/]+\//g, '[extension]/')
		.replace(/[A-Za-z0-9_+=/%.-]{64,}/g, '[long value]').slice(0, 600);
}

async function sample(page, origin) {
	const host = await page.evaluate(() => ({
		phase: document.querySelector('[data-weave-diagnostic]')?.dataset.weaveDiagnostic || null,
		frames: document.querySelectorAll('iframe[src*="player.html?embedded=1"]').length,
	}));
	const frame = page.frames().find(item => item.url().startsWith(origin + '/player.html?'));
	if (!frame) return {...host, player: null};
	try {
		const player = await frame.evaluate(() => {
			const video = document.querySelector('video');
			return {
				state: document.body?.getAttribute('data-состояние'),
				readyState: document.readyState,
				visible: document.body ? !document.body.hidden : false,
				video: video ? {width: video.videoWidth, height: video.videoHeight,
					time: video.currentTime, paused: video.paused, readyState: video.readyState,
					error: video.error?.code || null, buffered: video.buffered.length} : null,
			};
		});
		return {...host, player};
	} catch (error) {
		return {...host, player: null, inspectionError: safeMessage(error.message)};
	}
}

async function observe(page, origin, result) {
	const deadline = Date.now() + 40000;
	let previousTime;
	while (Date.now() < deadline) {
		const state = await sample(page, origin);
		result.samples.push({elapsed: Date.now() - result.started, ...state});
		const video = state.player?.video;
		if (video?.width > 0 && !video.paused && previousTime !== undefined && video.time > previousTime + 0.2) {
			result.outcome = state.phase === 'playing' ? 'playing' : 'playing-with-status-mismatch';
			return;
		}
		if (video?.width > 0) previousTime = video.time;
		await page.waitForTimeout(1000);
	}
	result.outcome = 'no-playback-observed';
}

async function checkControls(page, origin, channel, report) {
	const frame = page.frames().find(item => item.url().startsWith(origin + '/player.html?'));
	assert.ok(frame, 'embedded frame exists');
	const checks = [
		['volume', async () => {
			await frame.locator('video').click();
			await frame.locator('[id="громкость"]').fill('75');
			assert.equal(await frame.locator('video').evaluate(video => video.volume), 0.75);
			const before = await frame.locator('video').evaluate(video => video.muted);
			await frame.locator('video').click({button: 'middle'});
			assert.equal(await frame.locator('video').evaluate(video => video.muted), !before);
			await frame.locator('video').click({button: 'middle'});
		}],
		['resize', async () => {
			for (const width of [900, 420, 1280]) {
				await page.setViewportSize({width, height: 800});
				await frame.locator('video').click();
				assert.ok(await frame.locator('video').evaluate(video => {
					const bounds = video.getBoundingClientRect();
					return bounds.width > 0 && bounds.height > 0 && getComputedStyle(video).objectFit === 'contain';
				}));
				assert.ok(await frame.locator('[id="переключитьполноэкранный"]').evaluate(button => {
					const panel = button.closest('.нижняя');
					return button.getBoundingClientRect().right <= panel.getBoundingClientRect().right + 1;
				}));
			}
		}],
		['chat-layout', async () => {
			const toggle = page.locator('[data-a-target="right-column__toggle-collapse-btn"]');
			await toggle.click({timeout: 5000});
			await frame.locator('video').waitFor({state: 'visible'});
			assert.equal(await frame.locator('video').evaluate(video => getComputedStyle(video).objectFit), 'contain');
			await toggle.click({timeout: 5000});
		}],
		['fullscreen', async () => {
			await frame.locator('video').click();
			await frame.locator('[id="переключитьполноэкранный"]').click();
			await frame.waitForFunction(() => !!document.fullscreenElement, null, {timeout: 5000});
			await frame.locator('[id="переключитьполноэкранный"]').click();
			await frame.waitForFunction(() => !document.fullscreenElement, null, {timeout: 5000});
		}],
		['replay', async () => {
			await frame.locator('video').click();
			await frame.locator('[id="переключитьтрансляцию"]').click();
			await frame.locator('body[data-состояние="8"]').waitFor({timeout: 5000});
			await frame.locator('[id="шкала"]').click();
			await frame.locator('[id="переключитьпаузу"]').click();
			await frame.waitForFunction(() => !document.querySelector('video').paused, null, {timeout: 5000});
			await frame.locator('[id="переключитьтрансляцию"]').click();
			await page.locator('[data-weave-diagnostic="playing"]').waitFor({timeout: 15000});
		}],
	];
	for (const [name, action] of checks) {
		const result = {channel, check: name};
		report.controls.push(result);
		try {
			await action();
			result.outcome = 'passed';
		} catch (error) {
			result.outcome = 'failed';
			result.error = safeMessage(error.message);
		} finally {
			await page.screenshot({path: path.join(output, channel + '-' + name + '.png')}).catch(() => {});
			console.log('CONTROL ' + JSON.stringify(result));
		}
	}
}

async function main() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weave-live-'));
	const report = {scenarios: [], controls: [], environment: {node: process.version}};
	let context;
	try {
		const unpacked = path.join(root, 'extension');
		const archive = execFileSync('python3', ['scripts/build_chrome.py'], {encoding: 'utf8'}).trim();
		execFileSync('python3', ['-m', 'zipfile', '-e', archive, unpacked]);
		report.environment.extensionVersion = JSON.parse(fs.readFileSync(path.join(unpacked, 'manifest.json'))).version;
		context = await chromium.launchPersistentContext(path.join(root, 'profile'), {
			channel: 'chromium', executablePath: process.env.CHROMIUM_PATH, headless: true,
			ignoreDefaultArgs: ['--disable-extensions'],
			args: [`--disable-extensions-except=${unpacked}`, `--load-extension=${unpacked}`],
		});
		report.environment.browser = context.browser()?.version();
		const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout: 10000});
		const extensionOrigin = 'chrome-extension://' + new URL(worker.url()).hostname;
		await worker.evaluate(() => chrome.storage.local.set({
			чВерсияНастроек: 2, чРежимПлеера: 1,
			чИнтервалАвтоскрытия: 60, лАвтоперенаправлениеЗамечено: true,
		}));
		for (const channel of channels) {
			const page = await context.newPage();
			await page.setViewportSize({width: 1280, height: 800});
			let active;
			page.on('pageerror', error => active?.errors.push({kind: 'pageerror', message: safeMessage(error.message)}));
			page.on('console', message => {
				if (message.type() === 'error') active?.errors.push({kind: 'console', message: safeMessage(message.text())});
			});
			page.on('requestfailed', request => {
				const url = new URL(request.url());
				active?.network.push({host: url.hostname, type: request.resourceType(), error: safeMessage(request.failure()?.errorText)});
			});
			page.on('response', response => {
				if (response.status() >= 400) active?.network.push({host: new URL(response.url()).hostname, status: response.status()});
			});
			for (const trigger of ['initial', 'reload', 'manual-restart']) {
				active = {channel, trigger, started: Date.now(), samples: [], errors: [], network: []};
				report.scenarios.push(active);
				try {
					if (trigger === 'initial') await page.goto('https://www.twitch.tv/' + channel, {waitUntil: 'domcontentloaded', timeout: 45000});
					if (trigger === 'reload') await page.reload({waitUntil: 'domcontentloaded', timeout: 45000});
					if (trigger === 'manual-restart') {
						await page.getByRole('button', {name: /restore twitch player/i}).click({timeout: 5000});
						await page.locator('[id="tw5-автоперенаправление"]').click({timeout: 5000});
					}
					await observe(page, extensionOrigin, active);
				} catch (error) {
					active.outcome = 'scenario-error';
					active.errors.push({kind: 'scenario', message: safeMessage(error.message)});
				}
				await page.screenshot({path: path.join(output, channel + '-' + trigger + '.png')}).catch(error => {
					active.errors.push({kind: 'screenshot', message: safeMessage(error.message)});
				});
				fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
				console.log(channel + ' / ' + trigger + ': ' + active.outcome);
				console.log(JSON.stringify({last: active.samples.at(-1), errors: active.errors.slice(0, 8), network: active.network.slice(0, 8)}));
			}
			if (active.outcome === 'playing') await checkControls(page, extensionOrigin, channel, report);
			const nextChannel = channels[(channels.indexOf(channel) + 1) % channels.length];
			if (nextChannel !== channel) {
				active = {channel: nextChannel, trigger: 'channel-change', started: Date.now(), samples: [], errors: [], network: []};
				report.scenarios.push(active);
				await page.goto('https://www.twitch.tv/' + nextChannel, {waitUntil: 'domcontentloaded', timeout: 45000});
				await observe(page, extensionOrigin, active);
				console.log(nextChannel + ' / channel-change: ' + active.outcome);
			}
			await page.close();
		}
		if (report.scenarios.some(item => item.outcome !== 'playing') || report.controls.some(item => item.outcome !== 'passed')) process.exitCode = 1;
	} finally {
		fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
		await context?.close();
		fs.rmSync(root, {recursive: true, force: true});
	}
}

main().catch(error => {
	console.error(safeMessage(error.message));
	process.exitCode = 1;
});
