'use strict';

м_i18n.TranslateDocument(document);
document.title = м_i18n.GetMessage('ProxyTitle');
const proxyEnabled = document.getElementById('enabled');
const proxyAddress = document.getElementById('address');
const proxyStatus = document.getElementById('status');
const saveProxy = document.querySelector('button');

browser.storage.local.get(['qualityProxyEnabled', 'qualityProxyUrl']).then(settings => {
	proxyEnabled.checked = settings.qualityProxyEnabled === true;
	proxyAddress.value = settings.qualityProxyUrl || '';
});

document.querySelector('form').addEventListener('submit', async event => {
	event.preventDefault();
	const address = proxyAddress.value.trim();
	if (proxyEnabled.checked && !WeaveQualityProxy.parseAddress(address)) {
		proxyStatus.textContent = м_i18n.GetMessage('ProxyInvalid');
		return;
	}
	// Request optional proxy access directly from this explicit user action.
	const permission = proxyEnabled.checked
		? browser.permissions.request({permissions: ['proxy']}) : Promise.resolve(true);
	saveProxy.disabled = true;
	try {
		if (!await permission) {
			proxyStatus.textContent = м_i18n.GetMessage('ProxyDenied');
			return;
		}
		await browser.storage.local.set({qualityProxyEnabled: proxyEnabled.checked, qualityProxyUrl: address});
		proxyStatus.textContent = м_i18n.GetMessage('ProxySaved');
	} catch (_) {
		proxyStatus.textContent = м_i18n.GetMessage('ProxySaveError');
	} finally {
		saveProxy.disabled = false;
	}
});
