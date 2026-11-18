'use strict';

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {readFileSync, appendFileSync} = require('node:fs');
const {firefox} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baselineRef = process.argv[2];
if (!baselineRef || !/^[a-f0-9]{7,40}$/.test(baselineRef)) {
	throw new Error('Pass the Git commit of the baseline as the first argument.');
}
const baseline = execFileSync('git', ['show', baselineRef + ':addon/content.js'], {encoding: 'utf8'});
const candidate = readFileSync('addon/content.js', 'utf8');
const common = readFileSync('addon/common.js', 'utf8');
const channelUrl = 'https://www.twitch.tv/weave_test_channel';
const messages = 120;

async function measure(browser, source) {
	const page = await browser.newPage();
	const errors = [];
	page.on('pageerror', error => errors.push(error.message));
	try {
		await page.route('**/*', route => {
			const url = route.request().url();
			if (url === channelUrl) {
				return route.fulfill({contentType: 'text/html', body: `
					<div class="top-nav__menu"><div><div></div></div></div>
					<main id="slot" style="width:900px;height:500px;overflow:hidden">
						<div data-a-target="video-player" style="width:100%;height:100%"><video></video></div>
					</main>
					<aside id="chat"></aside>`});
			}
			if (url.startsWith('https://weave.example.test/player.html?')) {
				return route.fulfill({contentType: 'text/html', body: '<title>Player fixture</title>'});
			}
			return route.abort();
		});
		await page.goto(channelUrl);
		await page.evaluate(() => {
			const storage = {чВерсияНастроек: 2, чРежимПлеера: 0, лАвтоперенаправлениеЗамечено: true};
			window.chrome = {
				runtime: {getURL: path => 'https://weave.example.test/' + path},
				i18n: {getMessage: name => name},
				storage: {
					onChanged: {addListener() {}},
					local: {
						get: (_, callback) => callback({...storage}),
						set: (changes, callback) => { Object.assign(storage, changes); callback?.(); }
					}
				}
			};

			const video = document.querySelector('video');
			const state = window.testCounters = {deliveries: 0, records: 0, starts: 0, pauses: 0, paused: false};
			Object.defineProperty(video, 'paused', {get: () => state.paused});
			video.pause = () => { ++state.pauses; state.paused = true; };
			video.play = async () => { ++state.starts; state.paused = false; };

			const NativeObserver = window.MutationObserver;
			window.MutationObserver = class extends NativeObserver {
				constructor(callback) {
					super((records, observer) => {
						++state.deliveries;
						state.records += records.length;
						callback(records, observer);
					});
				}
			};
		});
		await page.addScriptTag({content: common + '\n' + source});

		const frame = page.locator('iframe[title="Weave Player"]');
		const embedded = page.locator('[data-weave-mode="1"]');
		await embedded.click();
		await frame.waitFor({state: 'visible'});
		assert.equal(await page.locator('video').evaluate(video => video.paused), true);

		const result = await page.evaluate(async count => {
			const {deliveries, records} = window.testCounters;
			const chat = document.querySelector('#chat');
			for (let i = 0; i < count; i++) {
				const line = document.createElement('p');
				line.textContent = 'Chat message ' + i;
				chat.appendChild(line);
				await new Promise(resolve => setTimeout(resolve, 0));
			}
			return {
				deliveries: window.testCounters.deliveries - deliveries,
				records: window.testCounters.records - records
			};
		}, messages);
		assert.equal(await frame.count(), 1);
		assert.equal(await page.locator('#chat p').count(), messages);

		// Reflow from a chat/sidebar width change must resize the same iframe.
		const width = (await frame.boundingBox()).width;
		await page.locator('#slot').evaluate(slot => { slot.style.width = '640px'; });
		await page.waitForFunction(prior => document.querySelector('iframe').getBoundingClientRect().width < prior, width);

		await page.getByRole('button', {name: /Restore Twitch player/}).click();
		await frame.waitFor({state: 'detached'});
		assert.equal(await page.locator('video').evaluate(video => video.paused), false);
		assert.equal(await page.evaluate(() => window.testCounters.starts), 1);

		await embedded.click();
		await frame.waitFor({state: 'visible'});
		await frame.evaluate(el => el.parentElement.remove());
		await page.waitForFunction(() => !document.querySelector('video').paused);
		assert.equal(await page.evaluate(() => window.testCounters.starts), 2);

		await embedded.click();
		await frame.waitFor({state: 'visible'});
		await page.locator('[data-weave-mode="0"]').click();
		await frame.waitFor({state: 'detached'});
		assert.equal(await page.locator('video').evaluate(video => video.paused), false);
		assert.deepEqual(errors, []);
		return result;
	} finally {
		await page.close();
	}
}

async function main() {
	const browser = await firefox.launch();
	try {
		const before = await measure(browser, baseline);
		const after = await measure(browser, candidate);
		assert.ok(before.deliveries > 0 && before.records >= messages, 'baseline observes chat mutations');
		assert.deepEqual(after, {deliveries: 0, records: 0}, 'candidate ignores chat mutations');
		const summary = [
			'### Weave Firefox performance experiment',
			'',
			'| Simulated chat messages | Baseline callbacks | Candidate callbacks | Baseline records | Candidate records |',
			'| ---: | ---: | ---: | ---: | ---: |',
			`| ${messages} | ${before.deliveries} | ${after.deliveries} | ${before.records} | ${after.records} |`,
			'',
			'Both builds passed resize, restore, frame removal and switching off checks.',
			'This fixture measures observer activity. It does not represent Twitch CPU usage or media stutter.',
			''
		].join('\n');
		console.log(summary);
		if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
	} finally {
		await browser.close();
	}
}

main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
