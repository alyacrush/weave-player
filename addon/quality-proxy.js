'use strict';

const WeaveQualityProxy = (() => {
	const marker = 'X-Weave-Playback-Token';
	function parseAddress(value) {
		if (typeof value !== 'string' || !/^https?:\/\//.test(value.trim())) return null;
		try {
			const url = new URL(value.trim());
			if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
			return {type: url.protocol.slice(0, -1), host: url.hostname.replace(/^\[|\]$/g, ''),
				port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)), failoverTimeout: 5};
		} catch (_) {
			return null;
		}
	}
	function requestKind(details, playerUrl) {
		if (details.type !== 'xmlhttprequest') return null;
		try {
			const source = new URL(details.documentUrl || details.originUrl);
			const player = new URL(playerUrl);
			if (source.protocol !== player.protocol || source.host !== player.host || source.pathname !== player.pathname) return null;
			const url = new URL(details.url);
			if (url.protocol !== 'https:' || url.port || url.username || url.password) return null;
			if (details.method === 'GET' && url.hostname === 'usher.ttvnw.net' &&
				/^\/api\/(?:v2\/)?channel\/hls\/[a-z0-9_]+\.m3u8$/i.test(url.pathname)) return 'playlist';
			if (details.method === 'POST' && url.hostname === 'gql.twitch.tv' && url.pathname === '/gql' &&
				details.requestHeaders?.some(header => header.name.toLowerCase() === marker.toLowerCase() && header.value === '1')) return 'token';
		} catch (_) {}
		return null;
	}
	function cleanHeaders(headers, anonymous) {
		const remove = new Set([marker.toLowerCase()]);
		if (anonymous) {
			for (const name of ['authorization', 'cookie', 'client-integrity', 'client-session-id']) remove.add(name);
		}
		return headers.filter(header => !remove.has(header.name.toLowerCase()));
	}
	return {marker, parseAddress, requestKind, cleanHeaders};
})();

if (typeof module !== 'undefined') module.exports = WeaveQualityProxy;
