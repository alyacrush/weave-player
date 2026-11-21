'use strict';

const {chromium} = require(process.env.PLAYWRIGHT_MODULE);
const path = require('node:path');
const output = value => console.log(JSON.stringify(value));

async function isPlaying(frame, timeout) {
	try {
		await frame.waitForFunction(() => {
			const video = document.querySelector('#глаз');
			return video?.videoWidth && video.currentTime > 1 && !video.paused;
		}, null, {timeout});
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const extension = process.argv[2];
	const context = await chromium.launchPersistentContext(path.join(process.env.RUNNER_TEMP, 'chrome-profile'), {
		channel: 'chromium',
		headless: true,
		ignoreDefaultArgs: ['--disable-extensions'],
		args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension],
	});
	try {
		const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout: 10_000});
		const extensionOrigin = 'chrome-extension://' + new URL(worker.url()).hostname;
		const page = context.pages()[0];
		let channel;
		for (const name of ['monstercat', 'esl_cs', 'zizaran', 'mathil1']) {
			const statuses = new Set();
			const record = response => {
				const host = new URL(response.url()).hostname;
				if (host === 'gql.twitch.tv' || host === 'usher.ttvnw.net') statuses.add(host + ' ' + response.status());
			};
			page.on('response', record);
			await page.goto(extensionOrigin + '/player.html?channel=' + name);
			const playing = await isPlaying(page, 15_000);
			page.off('response', record);
			output({channel: name, mode: 'standalone', playing, statuses: [...statuses]});
			if (playing) {
				channel = name;
				break;
			}
		}
		if (!channel) throw new Error('No live Twitch channel played in standalone mode');
		await page.goto('https://www.twitch.tv/' + channel + '?weave=0', {waitUntil: 'domcontentloaded'});
		await page.locator('[data-weave-mode="1"]').click({timeout: 20_000});
		const frame = page.frameLocator('iframe[src*="player.html?embedded=1"]');
		await frame.locator('video').waitFor({timeout: 15_000, state: 'attached'});
		const embedded = page.frames().find(candidate => candidate.url().startsWith(extensionOrigin + '/player.html'));
		const playing = await isPlaying(embedded, 25_000);
		output({channel, mode: 'embedded', playing});
		if (!playing) throw new Error('Live Twitch channel did not play in embedded mode');
	} finally {
		await context.close();
	}
}

main().catch(error => {
	console.error(error.message);
	process.exitCode = 1;
});
