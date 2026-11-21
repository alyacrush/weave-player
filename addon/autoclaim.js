'use strict';

(() => {
	const setting = 'autoClaimChannelPoints';
	const claimableBonus = '.claimable-bonus__icon, [data-test-selector="claimable-bonus__icon"]';
	let timer;
	let settingChanged = false;

	function claimBonus() {
		const button = document.querySelector(claimableBonus)?.closest('button');
		if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true' &&
			button.getClientRects().length) {
			button.click();
		}
	}

	function applySetting(enabled) {
		if (enabled === true && timer === undefined) {
			timer = setInterval(claimBonus, 5000);
			claimBonus();
		} else if (enabled !== true && timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'local' && Object.hasOwn(changes, setting)) {
			settingChanged = true;
			applySetting(changes[setting].newValue);
		}
	});

	chrome.storage.local.get(setting, values => {
		if (!chrome.runtime.lastError && !settingChanged) {
			applySetting(values[setting]);
		}
	});
})();
