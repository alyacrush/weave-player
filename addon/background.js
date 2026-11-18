'use strict';

const beforeSendHeadersOptions = [ 'requestHeaders', 'blocking' ];

for (const option of Object.keys(chrome.webRequest.OnBeforeSendHeadersOptions)) {
	if (chrome.webRequest.OnBeforeSendHeadersOptions[option] === 'extraHeaders') {
		beforeSendHeadersOptions.push('extraHeaders');
		break;
	}
}

chrome.webRequest.onBeforeSendHeaders.addListener(request => {
	if (request.frameId !== 0 || request.parentFrameId !== -1) {
		return;
	}
	const initiator = request.initiator || request.originUrl || request.documentUrl;
	if (!initiator || !initiator.startsWith(chrome.runtime.getURL('').slice(0, -1))) {
		return;
	}
	const remove = [ 'origin', 'referer' ];
	const requestHeaders = request.requestHeaders.filter(({name}) => !remove.includes(name.toLowerCase()));
	requestHeaders.push({
		name: 'Origin',
		value: 'https://www.twitch.tv'
	}, {
		name: 'Referer',
		value: 'https://www.twitch.tv/'
	});
	return {
		requestHeaders
	};
}, {
	urls: chrome.runtime.getManifest().permissions.filter(permission => permission.includes(':')),
	types: [ 'xmlhttprequest' ]
}, beforeSendHeadersOptions);

// Review disclosure: this deliberately relaxes framing only for the Weave chat.
chrome.webRequest.onHeadersReceived.addListener(details => {
	if (details.parentFrameId !== 0 || details.frameId <= 0 ||
		!/^https:\/\/www\.twitch\.tv\/popout\/[a-z0-9_]+\/chat(?:\?|$)/i.test(details.url)) {
		return;
	}
	const player = chrome.runtime.getURL('player.html');
	const parent = details.documentUrl;
	if (!parent || parent.split(/[?#]/, 1)[0] !== player) {
		return;
	}
	const responseHeaders = [];
	for (const header of details.responseHeaders) {
		const name = header.name.toLowerCase();
		if (name === 'x-frame-options') {
			continue;
		}
		if (name === 'content-security-policy' && typeof header.value === 'string') {
			const policies = header.value.split(',').map(policy =>
				policy.split(';').map(directive => directive.trim()).filter(directive =>
					directive && !/^frame-ancestors(?:\s|$)/i.test(directive)
				).join('; ')
			).filter(Boolean);
			if (policies.length) {
				responseHeaders.push({...header, value: policies.join(', ')});
			}
		} else {
			responseHeaders.push(header);
		}
	}
	return {responseHeaders};
}, {
	urls: ['https://www.twitch.tv/popout/*/chat*'],
	types: ['sub_frame']
}, ['blocking', 'responseHeaders']);

chrome.runtime.onMessage.addListener((оСообщение, оОтправитель, фОтветить) => {
	if (оСообщение.сЗапрос === 'ЗапуститьПроигрыватель' && оОтправитель.frameId === 0) {
		const оПараметры = {
			url: `${chrome.runtime.getURL('player.html')}${оСообщение.сАдрес}`
		};
		if (оСообщение.лЗаменить) {
			оПараметры.loadReplace = true;
		}
		chrome.tabs.update(оОтправитель.tab.id, оПараметры);
	}
});