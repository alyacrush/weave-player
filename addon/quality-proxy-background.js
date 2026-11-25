'use strict';

(() => {
	const playerUrl = browser.runtime.getURL('player.html');
	let proxy = null;
	let ready;
	let listening = false;
	let generation = 0;
	async function refresh() {
		const current = ++generation;
		proxy = null;
		const [settings, permitted] = await Promise.all([
			browser.storage.local.get(['qualityProxyEnabled', 'qualityProxyUrl']),
			browser.permissions.contains({permissions: ['proxy']})
		]);
		if (current !== generation) return;
		if (settings.qualityProxyEnabled === true && permitted) proxy = WeaveQualityProxy.parseAddress(settings.qualityProxyUrl);
		if (permitted && !listening) {
			browser.proxy.onRequest.addListener(route, {
				urls: ['https://usher.ttvnw.net/*', 'https://gql.twitch.tv/*'], types: ['xmlhttprequest']
			}, ['requestHeaders']);
			listening = true;
		} else if (!permitted && listening) {
			browser.proxy.onRequest.removeListener(route);
			listening = false;
		}
	}
	async function route(details) {
		await ready;
		if (!proxy || !WeaveQualityProxy.requestKind(details, playerUrl)) return {type: 'direct'};
		// End this route here if the configured proxy fails. Never silently use
		// another browser proxy or change regions during this playback session.
		return [proxy, null];
	}
	function reload() {
		ready = refresh().catch(() => { proxy = null; });
	}
	browser.storage.onChanged.addListener((changes, area) => {
		if (area === 'local' && ('qualityProxyEnabled' in changes || 'qualityProxyUrl' in changes)) reload();
	});
	browser.permissions.onAdded.addListener(reload);
	browser.permissions.onRemoved.addListener(reload);
	reload();
})();
