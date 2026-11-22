'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = require('../addon/quality-proxy.js');
const player = 'moz-extension://weave-test/player.html';
const token = {type: 'xmlhttprequest', method: 'POST', documentUrl: player + '?embedded=1&channel=test',
	url: 'https://gql.twitch.tv/gql', requestHeaders: [{name: policy.marker, value: '1'}]};
const playlist = {...token, method: 'GET', url: 'https://usher.ttvnw.net/api/channel/hls/test.m3u8?token=fixture'};

for (const invalid of ['', 'proxy.example:3128', 'socks://host:1080', 'http://user:pass@host',
	'https://host/path', 'http://host/?token=secret', 'http://host/#secret', 'http://host:99999']) {
	assert.equal(policy.parseAddress(invalid), null, invalid);
}
assert.equal(policy.parseAddress('http://[::1]:3128').host, '::1');
assert.equal(policy.parseAddress('https://proxy.example').port, 443);
assert.equal(policy.requestKind(token, player), 'token');
assert.equal(policy.requestKind(playlist, player), 'playlist');
for (const change of [
	{documentUrl: 'https://www.twitch.tv/test'}, {documentUrl: 'moz-extension://other/player.html'},
	{documentUrl: player + '.evil'}, {documentUrl: 'moz-extension://weave-test/proxy-settings.html'},
	{url: 'http://gql.twitch.tv/gql'}, {url: 'https://gql.twitch.tv:444/gql'},
	{url: 'https://gql.twitch.tv/integrity'}, {requestHeaders: []}, {type: 'speculative'},
	{method: 'GET'}, {documentUrl: undefined, originUrl: undefined}
]) assert.equal(policy.requestKind({...token, ...change}, player), null);
for (const url of ['https://usher.ttvnw.net/vod/test.m3u8', 'https://test.playlist.ttvnw.net/live.m3u8',
	'https://cdn.example/live0.m4s', 'https://www.twitch.tv/popout/test/chat']) {
	assert.equal(policy.requestKind({...playlist, url}, player), null);
}
assert.deepEqual(policy.cleanHeaders([
	{name: policy.marker, value: '1'}, {name: 'Authorization', value: 'fixture'},
	{name: 'COOKIE', value: 'fixture'}, {name: 'Client-Integrity', value: 'fixture'},
	{name: 'Client-Session-Id', value: 'fixture'}, {name: 'X-Device-ID', value: 'ephemeral'}
], true), [{name: 'X-Device-ID', value: 'ephemeral'}]);

async function main() {
	const events = {};
	const capture = name => ({addListener(listener) { events[name] = listener; }});
	let permitted = false;
	let settings = {qualityProxyEnabled: false, qualityProxyUrl: 'http://127.0.0.1:3128'};
	let route;
	const browser = {
		runtime: {getURL: name => 'moz-extension://weave-test/' + name,
			getManifest: () => ({permissions: ['https://gql.twitch.tv/*']}), onMessage: capture('message')},
		storage: {local: {get: async () => ({...settings})}, onChanged: capture('storage')},
		permissions: {contains: async () => permitted, onAdded: capture('grant'), onRemoved: capture('revoke')},
		proxy: {onRequest: {addListener(listener) {route = listener;}, removeListener() {route = null;}}},
		webRequest: {OnBeforeSendHeadersOptions: {}, onBeforeSendHeaders: capture('headers'), onHeadersReceived: capture('chatheaders')}
	};
	const context = vm.createContext({browser, chrome: browser, URL});
	vm.runInContext(fs.readFileSync('addon/quality-proxy.js', 'utf8'), context);
	vm.runInContext(fs.readFileSync('addon/quality-proxy-background.js', 'utf8'), context);
	vm.runInContext(fs.readFileSync('addon/background.js', 'utf8'), context);
	const settle = () => new Promise(resolve => setImmediate(resolve));
	await settle();
	assert.equal(route, undefined, 'no proxy listener before permission');
	permitted = true;
	events.grant();
	await settle();
	assert.equal((await route(token)).type, 'direct', 'permission alone does not enable routing');
	settings.qualityProxyEnabled = true;
	events.storage({qualityProxyEnabled: {newValue: true}}, 'local');
	await settle();
	const selected = await route(token);
	assert.equal(selected[0].host, '127.0.0.1');
	assert.equal(selected[1], null, 'a failed proxy cannot silently change route');
	assert.equal((await route({...token, documentUrl: 'https://www.twitch.tv/test'})).type, 'direct');
	assert.equal((await route({...token, requestHeaders: []})).type, 'direct');
	assert.equal(events.headers({...token, requestHeaders: [...token.requestHeaders,
		{name: 'Authorization', value: 'fixture'}, {name: 'Cookie', value: 'fixture'}]}).requestHeaders.length, 0);
	settings.qualityProxyEnabled = false;
	events.storage({qualityProxyEnabled: {newValue: false}}, 'local');
	await settle();
	assert.equal((await route(playlist)).type, 'direct', 'disable takes effect without restarting the background');
	permitted = false;
	events.revoke();
	await settle();
	assert.equal(route, null);
	// Exercise the actual player request builder with a synthetic signed-in
	// account. Only the dedicated playback-token call may become anonymous.
	const source = fs.readFileSync('addon/player.js', 'utf8');
	const start = source.indexOf('function отправитьЗапросGql(');
	const end = source.indexOf('function ИзменитьПодпискуЗрителяНаКанал()', start);
	assert.ok(start > 0 && end > start);
	let headers;
	let enabled = true;
	const client = vm.createContext({
		crypto: require('node:crypto').webcrypto,
		WeaveQualityProxy: policy, ЗАГРУЖАТЬ_GQL_НЕ_ДОЛЬШЕ: 15000,
		_сИдУстройства: 'persistent-fixture-device', _сТокенЗрителя: 'fixture-account-token', proxyDeviceId: '',
		Проверить: assert.ok, ЭтоНепустаяСтрока: value => typeof value === 'string' && value.length > 0,
		м_Настройки: {Получить: key => key === 'qualityProxyEnabled' ? enabled : 'http://127.0.0.1:3128'},
		м_Загрузчик: {Загрузить: async (_cancel, _method, _url, _timeout, sent) => {
			headers = sent;
			return {data: {}};
		}}
	});
	vm.runInContext(source.slice(start, end), client);
	await vm.runInContext("отправитьЗапросGql(null, 'fixture', null, true, false, 'test', 15000, true)", client);
	assert.equal(headers.Authorization, undefined);
	assert.equal(headers[policy.marker], '1');
	assert.notEqual(headers['X-Device-ID'], 'persistent-fixture-device');
	await vm.runInContext("отправитьЗапросGql(null, 'fixture', null, true, false, 'test')", client);
	assert.equal(headers.Authorization, 'OAuth fixture-account-token');
	assert.equal(headers[policy.marker], undefined);
	enabled = false;
	await vm.runInContext("отправитьЗапросGql(null, 'fixture', null, true, false, 'test', 15000, true)", client);
	assert.equal(headers.Authorization, 'OAuth fixture-account-token');
	console.log('PASS: quality proxy defaults, permission changes, exact request scope, anonymous headers and failure isolation');
}

main().catch(error => {console.error(error); process.exitCode = 1;});
