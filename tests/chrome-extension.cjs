'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name));
const channelPage = 'https://www.twitch.tv/testchannel';
const blockedFramePage = 'https://www.twitch.tv/testblocked?weave=0';
const invalidMediaPage = 'https://www.twitch.tv/testinvalidmedia?weave=0';
const mediaHost = 'https://test.ttvnw.net';
const chatPage = 'https://www.twitch.tv/popout/testchannel/chat';
const showNativePlayer = `
	<nav class="top-nav__menu"><div><div></div></div></nav>
	<div data-a-target="video-player" style="width:640px;height:360px"><video></video></div>
	<aside>Native Twitch chat</aside>
`;
const master = `#EXTM3U
#EXT-X-TWITCH-INFO:SERVER-TIME="${Date.now() / 1000}",BROADCAST-ID="73"
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="source",NAME="Source",AUTOSELECT=YES,DEFAULT=YES
#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=160x90,CODECS="avc1.42c00d,mp4a.40.2",VIDEO="source"
${mediaHost}/live.m3u8
`;

async function serveFixture(route) {
	const request = route.request();
	const url = new URL(request.url());
	const headers = {'access-control-allow-origin': '*'};
	if (request.method() === 'OPTIONS') {
		await route.fulfill({status: 204, headers: {
			...headers,
			'access-control-allow-methods': 'GET, POST',
			'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
		}});
	} else if (url.hostname === 'gql.twitch.tv') {
		const {query, variables} = request.postDataJSON();
		const user = {id: '42', displayName: 'Test Channel', description: '', stream: {id: '73', title: 'Test live stream', viewersCount: 1}};
		const data = query.includes('streamPlaybackAccessToken')
			? {streamPlaybackAccessToken: {value: JSON.stringify({channel: variables.login, channel_id: 42}), signature: 'fixture'}}
			: {user};
		await route.fulfill({headers, json: {data}});
	} else if (url.hostname === 'usher.ttvnw.net') {
		const body = url.pathname.endsWith('/testinvalidmedia.m3u8')
			? master.replace('/live.m3u8', '/encrypted.m3u8')
			: master;
		await route.fulfill({headers, body});
	} else if (url.origin === mediaHost) {
		const name = url.pathname.slice(1);
		const playlist = () => fixture('live.m3u8').toString().replace(/#EXT-X-ENDLIST\n?/, '').replaceAll('#EXTINF:2.000000,', '#EXTINF:2.000000,live');
		const body = name === 'encrypted.m3u8'
			? playlist().replace('#EXT-X-MAP', '#EXT-X-KEY:METHOD=SAMPLE-AES,URI="mock"\n#EXT-X-MAP')
			: name === 'live.m3u8' ? playlist() : fixture(name);
		await route.fulfill({headers, body});
	} else if (url.href === blockedFramePage || url.href === invalidMediaPage || url.href === channelPage || url.href.startsWith(channelPage + '?')) {
		await route.fulfill({contentType: 'text/html', body: showNativePlayer});
	} else if (url.href.startsWith(chatPage + '?')) {
		await route.fulfill({contentType: 'text/html', body: '<title>Twitch chat</title><p>Chat fixture</p>'});
	} else {
		await route.abort();
	}
}

async function waitForVideo(frame) {
	try {
		await frame.waitForFunction(() => {
			const video = document.querySelector('video');
			return video?.videoWidth > 0 && video.played.length &&
				video.played.end(0) - video.played.start(0) > 1.2 && !video.paused;
		}, null, {timeout: 15_000});
	} catch (error) {
		// This test uses only synthetic requests and never opens a live channel.
		console.error(await frame.evaluate(() => ({
			state: document.body.getAttribute('data-состояние'),
			body: document.body.innerText.slice(0, 500),
			journal: typeof м_Журнал === 'undefined' ? null : м_Журнал.ПолучитьДанныеДляОтчета().slice(-30),
		})));
		throw error;
	}
}

async function main() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weave-chrome-'));
	let context;
	try {
		const unpacked = path.join(root, 'extension');
		const archive = execFileSync('python3', ['scripts/build_chrome.py'], {encoding: 'utf8'}).trim();
		execFileSync('python3', ['-m', 'zipfile', '-e', archive, unpacked]);
		context = await chromium.launchPersistentContext(path.join(root, 'profile'), {
			channel: 'chromium',
			executablePath: process.env.CHROMIUM_PATH,
			headless: true,
			ignoreDefaultArgs: ['--disable-extensions'],
			args: [`--disable-extensions-except=${unpacked}`, `--load-extension=${unpacked}`],
		});
		const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout: 10_000});
		const extensionOrigin = 'chrome-extension://' + new URL(worker.url()).hostname;
		await worker.evaluate(() => chrome.storage.local.set({
			чВерсияНастроек: 2,
			чРежимПлеера: 0,
			лАвтоперенаправлениеЗамечено: true,
		}));
		await context.route(/https:\/\//, serveFixture);
		const page = context.pages()[0] || await context.newPage();
		const errors = [];
		page.on('pageerror', error => errors.push(error.message));
		page.on('console', msg => {
			if (['error', 'warning'].includes(msg.type())) console.log(msg.text().slice(0, 250));
		});
		await page.goto(channelPage);
		const [embedded] = await Promise.all([
			page.waitForEvent('framenavigated', {
				predicate: frame => frame.url().startsWith(extensionOrigin + '/player.html'),
				timeout: 10_000,
			}),
			page.locator('[data-weave-mode="1"]').click(),
		]);
		assert.ok(embedded, 'the extension frame loads in the channel page');
		assert.equal(page.url(), channelPage);
		await waitForVideo(embedded);
		await page.locator('[data-weave-diagnostic="playing"]').waitFor({timeout: 5000});
		await page.getByText('Native Twitch chat').waitFor();
		await page.getByRole('button', {name: /restore twitch player/i}).click();
		await page.locator('iframe[src*="player.html?embedded=1"]').waitFor({state: 'detached'});
		assert.equal(page.url(), channelPage);

		await page.locator('[data-weave-mode="2"]').click();
		await page.waitForURL(extensionOrigin + '/player.html?channel=testchannel');
		await waitForVideo(page);
		const chat = context.waitForEvent('page');
		await page.locator('#переключитьчат').click();
		const chatTab = await chat;
		await chatTab.waitForURL(chatPage + '?*');
		await chatTab.getByText('Chat fixture').waitFor();
		assert.equal(await page.locator('iframe#чат').count(), 0);
		await chatTab.close();
		await page.locator('#переключитьтрансляцию').click();
		await page.locator('body[data-состояние="8"]').waitFor();
		await page.locator('#шкала').click({position: {x: 12, y: 5}});
		await page.locator('#переключитьпаузу').click();
		await page.waitForFunction(() => !document.querySelector('video').paused);

		assert.deepEqual(errors, []);

		await page.goto(invalidMediaPage);
		await page.locator('[data-weave-mode="1"]').click();
		const errorStatus = page.locator('[data-weave-diagnostic="error"]');
		await errorStatus.waitFor({timeout: 12000});
		assert.match(await errorStatus.innerText(), /encrypted.*J0219/);
		await page.frameLocator('iframe[src*="player.html?embedded=1"]')
			.frameLocator('iframe[src="report.html"]')
			.getByText(/This broadcast is encrypted/).waitFor({timeout: 5000});

		await page.addInitScript(blockedPath => {
			if (location.pathname !== blockedPath) return;
			// Keep the iframe element mounted but prevent its player document from starting.
			const observer = new MutationObserver(() => {
				const frame = document.querySelector('iframe[src*="player.html?embedded=1"]');
				if (!frame) return;
				observer.disconnect();
				frame.src = 'about:blank';
			});
			observer.observe(document, {subtree: true, childList: true});
		}, new URL(blockedFramePage).pathname);
		await page.goto(blockedFramePage);
		await page.locator('[data-weave-mode="1"]').click();
		await page.locator('[data-weave-diagnostic="frame"]').waitFor({timeout: 5000});
		await page.evaluate(origin => {
			const data = {type: 'weave-embedded-status', phase: 'playing'};
			window.postMessage(data, location.origin);
			const frame = document.querySelector('iframe[src="about:blank"]');
			window.dispatchEvent(new MessageEvent('message', {data, origin, source: frame.contentWindow}));
		}, extensionOrigin);
		await page.locator('[data-weave-diagnostic="frame-timeout"]').waitFor({timeout: 14000});
		await page.getByRole('button', {name: /restore twitch player/i}).click();
		await page.locator('[data-weave-diagnostic]').waitFor({state: 'detached'});
		console.log('PASS: Twitch page reports playback, a safe error code, and a blocked frame; page messages cannot spoof progress');

		await page.goto(channelPage + '?weave=0');
		await page.locator('[data-weave-mode="1"]').click();
		await page.locator('[data-weave-diagnostic="playing"]').waitFor({timeout: 15000});
		const stoppedPlayer = page.frames().find(frame => frame.url().startsWith(extensionOrigin + '/player.html'));
		const released = await stoppedPlayer.evaluate(() => {
			const bytes = new ArrayBuffer(8 * 1024 * 1024);
			г_моОчередь.Добавить(new Сегмент(ОБРАБОТКА_ЗАГРУЖЕН, bytes, 2, false));
			const before = {bytes: bytes.byteLength, queued: г_моОчередь.length};
			try {
				м_Отладка.ЗавершитьРаботуИПоказатьСообщение('J0208');
			} catch (error) {
				if (error !== undefined) throw error;
			}
			return {before, after: {bytes: bytes.byteLength, queued: г_моОчередь.length}};
		});
		assert.equal(released.before.bytes, 8 * 1024 * 1024);
		assert.ok(released.before.queued > 0);
		assert.deepEqual(released.after, {bytes: 0, queued: 0});
		await page.locator('[data-weave-diagnostic="error"]').waitFor({timeout: 5000});
		console.log('PASS: fatal playback error releases queued media bytes');
		console.log('PASS: Chromium MV3 loads, plays fixture video in both modes, restores Twitch, opens official chat, and replays buffered video');
	} finally {
		await context?.close();
		fs.rmSync(root, {recursive: true, force: true});
	}
}

main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
