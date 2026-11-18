'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium, firefox} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const playerMarkup = fs.readFileSync('addon/player.html', 'utf8');
const playerNavigation = fs.readFileSync('addon/player-navigation.js', 'utf8');
const playerCss = fs.readFileSync('addon/player.css', 'utf8');
const commonCss = fs.readFileSync('addon/common.css', 'utf8');

const hostUrl = 'https://twitch.example.test/channel';
const playerUrl = 'https://weave.example.test/player.html';
const embeddedUrl = playerUrl + '?embedded=1&channel=test';
const useChromium = process.env.WEAVE_TEST_BROWSER === 'chromium';

async function main() {
	const browser = useChromium
		? await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium'})
		: await firefox.launch();
	try {
		const context = await browser.newContext();
		// Use the actual menu markup and navigation script. Stub playback and network
		// so this test can run without Twitch credentials, a live stream, or AMO.
		await context.route('**/*', async route => {
			const url = new URL(route.request().url());
			if (url.href === hostUrl) {
				await route.fulfill({contentType: 'text/html', body: `<iframe title="Weave Player" width="1100" height="700" src="${embeddedUrl}"></iframe>`});
			} else if (url.origin === new URL(playerUrl).origin && url.pathname === '/player.html') {
				await route.fulfill({contentType: 'text/html', body: playerMarkup.replace(/<link rel=(?:dns-prefetch|preconnect)[^>]*>/g, '')});
			} else if (url.href === new URL('player-navigation.js', playerUrl).href) {
				await route.fulfill({contentType: 'text/javascript', body: playerNavigation});
			} else if (url.href === new URL('player.css', playerUrl).href) {
				await route.fulfill({contentType: 'text/css', body: playerCss});
			} else if (url.href === new URL('common.css', playerUrl).href) {
				await route.fulfill({contentType: 'text/css', body: commonCss});
			} else if (route.request().isNavigationRequest()) {
				await route.fulfill({contentType: 'text/html', body: '<title>Linked page</title>'});
			} else {
				await route.abort();
			}
		});
		const page = await context.newPage();
		await page.goto(hostUrl);
		const frame = page.frames().find(candidate => candidate.url() === embeddedUrl);
		assert.ok(frame, 'embedded player frame loaded');
		await showMenu(frame);
		assert.equal(await frame.locator('base').getAttribute('target'), '_blank');

		const menu = frame.locator('#главноеменю');
		const menuLinks = menu.locator('a[href]');
		const destinations = await menuLinks.evaluateAll(links => links.map(link => link.href));
		assert.ok(destinations.includes('https://www.twitch.tv/directory/following'));
		for (const [index, destination] of destinations.entries()) {
			const [popup] = await Promise.all([
				page.waitForEvent('popup'),
				menuLinks.nth(index).click()
			]);
			await popup.waitForURL(destination);
			assert.equal(await popup.evaluate(() => window.opener === null), true);
			assert.equal(frame.url(), embeddedUrl, 'the link must leave the player frame intact');
			assert.equal(page.url(), hostUrl, 'the Twitch channel must stay open');
			await popup.close();
		}

		// Replay links receive their href dynamically after the menu is rendered.
		const replay = menu.locator('#адресзаписи');
		await replay.evaluate(link => {
			link.href = 'https://www.twitch.tv/videos/123?t=1m';
			link.tabIndex = 0;
		});
		const [popup] = await Promise.all([
			page.waitForEvent('popup'),
			replay.press('Enter')
		]);
		await popup.waitForURL('https://www.twitch.tv/videos/123?t=1m');
		assert.equal(frame.url(), embeddedUrl);
		await popup.close();

		const standalone = await context.newPage();
		await standalone.goto(playerUrl + '?channel=test');
		await showMenu(standalone);
		assert.equal(await standalone.locator('base[target]').count(), 0);
		await standalone.locator('#главноеменю a[href="https://www.twitch.tv/directory/following"]').click();
		await standalone.waitForURL('https://www.twitch.tv/directory/following');
		console.log('PASS: embedded player menu links, keyboard replay link, and standalone navigation');
	} finally {
		await browser.close();
	}
}

function showMenu(pageOrFrame) {
	return pageOrFrame.evaluate(() => {
		document.body.hidden = false;
		document.getElementById('главноеменю').classList.add('окнооткрыто');
	});
}

main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
