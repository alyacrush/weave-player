'use strict';

const PLAYER_OFF = 0;
const PLAYER_EMBEDDED = 1;
const PLAYER_PAGE = 2;
const PLAYER_MODE_KEY = 'чРежимПлеера';
const PLAYER_MODE_MESSAGES = ['J0601', 'J0602', 'J0603'];
let cancelEmbeddedWait = null;

function playerMode() {
	return м_Настройки.Получить(PLAYER_MODE_KEY);
}

function canAutoLaunch(address) {
	return address.лМожноПеренаправлять && playerMode() !== PLAYER_OFF &&
		(playerMode() !== PLAYER_EMBEDDED || !address.лМобильнаяВерсия);
}

let г_оРазобранныйАдрес = null;
let г_оЗапрос = null;
let observedAddress = '';
let launchGeneration = 0;

const м_Отладка = {
	ЗавершитьРаботуИПоказатьСообщение: завершитьРаботу,
	ПойманоИсключение: завершитьРаботу
};

function завершитьРаботу(пИсключениеИлиКодСообщения) {
	if (!г_лРаботаЗавершена) {
		console.error(пИсключениеИлиКодСообщения);
		try {
			г_лРаботаЗавершена = true;
			м_Журнал.Окак('[content.js] Работа завершена');
		} catch (_) {}
	}
	throw void 0;
}

function задатьАдресСтраницы(сАдрес, лЗаменить = false) {
	chrome.runtime.sendMessage({
		сЗапрос: 'ЗапуститьПроигрыватель',
		сАдрес,
		лЗаменить
	});
}

function вставитьНаСтраницу(фВставить) {
	const узСкрипт = document.createElement('script');
	узСкрипт.textContent = `\n\t\t'use strict';\n\t\t(${фВставить})();\n\t`;
	(document.head || document.documentElement).appendChild(узСкрипт);
	узСкрипт.remove();
}

const bypassParameter = АДРЕС_НЕ_ПЕРЕНАПРАВЛЯТЬ.split('=')[0];
const legacyBypassParameter = 'twitch5';

function этотАдресМожноПеренаправлять(оАдрес) {
	const params = new URLSearchParams(оАдрес.search);
	return !params.has(bypassParameter, '0') && !params.has(legacyBypassParameter, '0');
}

function запретитьАвтоперенаправлениеЭтойСтраницы() {
	const url = new URL(location.href);
	url.searchParams.delete(legacyBypassParameter, '0');
	url.searchParams.set(bypassParameter, '0');
	history.replaceState(history.state, '', url);
	observedAddress = location.pathname + location.search;
}

разобратьАдрес.ЭТО_НЕ_КОД_КАНАЛА = new Set([ 'directory', 'embed', 'friends', 'inventory', 'login', 'logout', 'manager', 'messages', 'payments', 'popout', 'search', 'settings', 'signup', 'subscriptions', 'team' ]);

function разобратьАдрес(оАдрес) {
	let лМобильнаяВерсия = false;
	let сСтраница = 'НЕИЗВЕСТНАЯ';
	let сКодКанала = '';
	let лМожноПеренаправлять = false;
	if (оАдрес.protocol === 'https:' && (оАдрес.host === 'www.twitch.tv' || оАдрес.host === 'm.twitch.tv')) {
		лМобильнаяВерсия = оАдрес.host === 'm.twitch.tv';
		const мсЧасти = оАдрес.pathname.split('/');
		if (мсЧасти.length <= 3 && мсЧасти[1] && !мсЧасти[2]) {
			if (!разобратьАдрес.ЭТО_НЕ_КОД_КАНАЛА.has(мсЧасти[1])) {
				сСтраница = 'ВОЗМОЖНО_ПРЯМАЯ_ТРАНСЛЯЦИЯ';
				сКодКанала = decodeURIComponent(мсЧасти[1]);
				лМожноПеренаправлять = этотАдресМожноПеренаправлять(оАдрес);
			}
		} else if ((мсЧасти[1] === 'embed' || мсЧасти[1] === 'popout') && мсЧасти[2] && мсЧасти[3] === 'chat') {
			сСтраница = 'ЧАТ_КАНАЛА';
			сКодКанала = decodeURIComponent(мсЧасти[2]);
		}
	}
	м_Журнал.Окак(`[content.js] Адрес разобран: Страница=${сСтраница} КодКанала=${сКодКанала} МожноПеренаправлять=${лМожноПеренаправлять}`);
	return {
		лМобильнаяВерсия,
		сСтраница,
		сКодКанала,
		лМожноПеренаправлять
	};
}

function observeChannelNavigation() {
	const addressKey = location.pathname + location.search;
	if (addressKey !== observedAddress) {
		observedAddress = addressKey;
		const previousChannel = г_оРазобранныйАдрес?.сКодКанала;
		г_оРазобранныйАдрес = разобратьАдрес(location);
		if (new URLSearchParams(location.search).has(legacyBypassParameter, '0')) {
			запретитьАвтоперенаправлениеЭтойСтраницы();
		}
		cancelPendingLaunch();
		if (previousChannel !== г_оРазобранныйАдрес.сКодКанала) {
			closeEmbeddedPlayer?.();
		}
		if (canAutoLaunch(г_оРазобранныйАдрес)) {
			checkLiveChannel(г_оРазобранныйАдрес.сКодКанала);
		}
	}
	if (!г_оРазобранныйАдрес.лМобильнаяВерсия && !получитьНашуКнопку()) {
		вставитьНашуКнопку();
	}
}

function cancelPendingLaunch() {
	++launchGeneration;
	cancelEmbeddedWait?.();
	const previous = г_оЗапрос;
	г_оЗапрос = null;
	previous?.abort();
}

function checkLiveChannel(channel) {
	const request = г_оЗапрос = new XMLHttpRequest();
	request.addEventListener('loadend', () => {
		if (request !== г_оЗапрос) return;
		г_оЗапрос = null;
		const address = разобратьАдрес(location);
		const user = request.response?.data?.user;
		if (request.status >= 200 && request.status < 300 &&
			address.сКодКанала === channel && canAutoLaunch(address) &&
			user?.stream && user.stream.isEncrypted !== true &&
			user.watchParty?.session?.state !== 'IN_PROGRESS') {
			launchPlayer(address, true);
		}
	});
	request.open('POST', 'https://gql.twitch.tv/gql#origin=twilight');
	request.responseType = 'json';
	request.timeout = 15000;
	request.setRequestHeader('Accept-Language', 'en-US');
	request.setRequestHeader('Client-ID', 'kimne78kx3ncx6brgo4mv6wki5h1ko');
	request.setRequestHeader('Content-Type', 'text/plain; charset=UTF-8');
	const device = document.cookie.match(/(?:^|;[ 	]?)unique_id=([^;]+)/);
	if (device) request.setRequestHeader('X-Device-ID', device[1]);
	request.send(создатьТелоЗапросаGql(`query($login: String!) {
		user(login: $login) {
			stream { isEncrypted }
			watchParty { session { state } }
		}
	}`, {login: channel}));
}

function launchPlayer(address, automatic = false) {
	if (address.сСтраница !== 'ВОЗМОЖНО_ПРЯМАЯ_ТРАНСЛЯЦИЯ') return;
	if (playerMode() === PLAYER_EMBEDDED && !address.лМобильнаяВерсия) {
		waitForEmbeddedPlayer(address.сКодКанала);
	} else if (playerMode() === PLAYER_PAGE) {
		if (!automatic) запретитьАвтоперенаправлениеЭтойСтраницы();
		задатьАдресСтраницы(ПолучитьАдресНашегоПроигрывателя(address.сКодКанала), automatic);
	}
}

let closeEmbeddedPlayer = null;
function openEmbeddedPlayer(channel) {
	if (closeEmbeddedPlayer) return true;
	const surface = document.querySelector('[data-a-target="video-player"]');
	const video = surface?.querySelector('video');
	if (!video || !surface.clientHeight) {
		return false;
	}

	const panel = document.createElement('div');
	panel.style.cssText = 'position:absolute;inset:0;z-index:100;background:#000;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden';
	const restore = document.createElement('button');
	restore.type = 'button';
	restore.textContent = м_i18n.GetMessage('RestoreTwitchPlayer');
	restore.style.cssText = 'color:white;background:#232328;padding:4px;cursor:pointer';
	const frame = document.createElement('iframe');
	frame.src = chrome.runtime.getURL('player.html') + '?embedded=1&channel=' + encodeURIComponent(channel);
	frame.title = м_i18n.GetMessage('WeavePlayerFrame');
	frame.allow = 'autoplay; fullscreen';
	frame.style.cssText = 'display:block;min-width:0;min-height:0;width:100%;height:100%;border:0';
	panel.append(restore, frame);

	const originalPosition = surface.style.position;
	const wasPlaying = !video.paused;
	if (getComputedStyle(surface).position === 'static') {
		surface.style.position = 'relative';
	}
	// Twitch may size the video surface larger than its clipped layout slot.
	function fitPanel() {
		const bounds = surface.getBoundingClientRect();
		let right = bounds.right;
		let bottom = bounds.bottom;
		for (let parent = surface.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
			const style = getComputedStyle(parent);
			if (!['hidden', 'clip'].includes(style.overflowX) && !['hidden', 'clip'].includes(style.overflowY)) continue;
			const clip = parent.getBoundingClientRect();
			if (['hidden', 'clip'].includes(style.overflowX)) {
				right = Math.min(right, clip.left + parent.clientLeft + parent.clientWidth);
			}
			if (['hidden', 'clip'].includes(style.overflowY)) {
				bottom = Math.min(bottom, clip.top + parent.clientTop + parent.clientHeight);
			}
		}
		panel.style.right = Math.max(0, bounds.right - right) + 'px';
		panel.style.bottom = Math.max(0, bounds.bottom - bottom) + 'px';
	}
	const sizeObserver = new ResizeObserver(fitPanel);
	for (let node = surface; node && node !== document.body; node = node.parentElement) {
		sizeObserver.observe(node);
	}

	function pauseOriginal(event) {
		if (event.target instanceof HTMLVideoElement) {
			event.target.pause();
		}
	}
	surface.addEventListener('play', pauseOriginal, true);
	video.pause();
	const mountedPath = location.pathname;
	const observer = new MutationObserver(() => {
		if (!panel.isConnected || location.pathname !== mountedPath) {
			closeEmbeddedPlayer?.();
		}
	});
	function close() {
		observer.disconnect();
		sizeObserver.disconnect();
		surface.removeEventListener('play', pauseOriginal, true);
		surface.style.position = originalPosition;
		panel.remove();
		closeEmbeddedPlayer = null;
		if (wasPlaying && video.isConnected && location.pathname === mountedPath) {
			video.play().catch(() => {});
		}
	}
	closeEmbeddedPlayer = close;
	restore.addEventListener('click', close);
	surface.append(panel);
	fitPanel();
	observer.observe(document.body, {childList: true, subtree: true});
	return true;
}

function waitForEmbeddedPlayer(channel) {
	cancelEmbeddedWait?.();
	if (openEmbeddedPlayer(channel)) return;
	const path = location.pathname;
	const timer = window.setInterval(() => {
		if (location.pathname !== path || playerMode() !== PLAYER_EMBEDDED || openEmbeddedPlayer(channel)) {
			cancelEmbeddedWait?.();
		}
	}, 250);
	const timeout = window.setTimeout(() => cancelEmbeddedWait?.(), 10000);
	cancelEmbeddedWait = () => {
		window.clearInterval(timer);
		window.clearTimeout(timeout);
		cancelEmbeddedWait = null;
	};
}

function selectNextPlayerMode(event) {
	event.preventDefault();
	setPlayerMode((playerMode() + 1) % PLAYER_MODE_MESSAGES.length);
}

function setPlayerMode(next) {
	cancelPendingLaunch();
	const address = разобратьАдрес(location);
	if (next === PLAYER_OFF) closeEmbeddedPlayer?.();
	if (next === playerMode()) {
		launchPlayer(address);
		return;
	}

	м_Настройки.Изменить(PLAYER_MODE_KEY, next, true);
	обновитьНашуКнопку();
	const generation = launchGeneration;
	const pathname = location.pathname;
	chrome.storage.local.set({[PLAYER_MODE_KEY]: next}, () => {
		if (chrome.runtime.lastError) {
			console.error('Could not save Weave player mode:', chrome.runtime.lastError.message);
			return;
		}
		if (generation === launchGeneration && pathname === location.pathname && next === playerMode()) {
			launchPlayer(address);
		}
	});
}

function обработатьЗапускНашегоПроигрывателя(оСобытие) {
	if (оСобытие.button === ЛЕВАЯ_КНОПКА) {
		оСобытие.preventDefault();
		cancelPendingLaunch();
		launchPlayer(разобратьАдрес(location));
	}
}

function обработатьЗакрытиеСправки(оСобытие) {
	оСобытие.preventDefault();
	if (оСобытие.type !== 'mouseover' || performance.now() > 3e3) {
		м_Журнал.Окак('[content.js] Закрываю справку');
		оСобытие.currentTarget.classList.remove('tw5-справка');
		оСобытие.currentTarget.removeEventListener('mouseover', обработатьЗакрытиеСправки);
		оСобытие.currentTarget.removeEventListener('touchstart', обработатьЗакрытиеСправки);
		м_Настройки.Изменить('лАвтоперенаправлениеЗамечено', true);
	}
}

function получитьНашуКнопку() {
	return document.getElementById('tw5-автоперенаправление');
}

function обновитьНашуКнопку() {
	const кнопка = получитьНашуКнопку();
	if (кнопка) {
		const mode = playerMode();
		const description = м_i18n.GetMessage(PLAYER_MODE_MESSAGES[mode]);
		кнопка.classList.toggle('tw5-запрещено', mode === PLAYER_OFF);
		кнопка.setAttribute('aria-label', description);
		кнопка.parentElement.querySelector('.tw5-подсказка').textContent = description + '\n' + м_i18n.GetMessage('J0600');
		for (const option of кнопка.parentElement.querySelectorAll('[data-weave-mode]')) {
			option.setAttribute('aria-pressed', String(Number(option.dataset.weaveMode) === mode));
		}
	}
	return кнопка;
}

function вставитьНашуКнопку() {
	const кудаВставить = document.querySelector('.top-nav__menu > div:last-child > div:first-child');
	if (!кудаВставить) {
		return false;
	}
	м_Журнал.Окак('[content.js] Вставляю нашу кнопку');
	кудаВставить.insertAdjacentHTML('afterend', `
	<div class="tw5-автоперенаправление tw5-js-удалить">
		<div class="weave-mode-switch" role="group">
			<button type="button" data-weave-mode="0"><span aria-hidden="true">○</span></button>
			<button type="button" data-weave-mode="1"><span aria-hidden="true">▣</span></button>
			<button type="button" data-weave-mode="2"><span aria-hidden="true">□</span></button>
		</div>
		<button type="button" id="tw5-автоперенаправление">
			<svg viewBox="0 0 128 128" aria-hidden="true">
				<path d="M15 35H30L43 72L57 40Q59 35 64 35H66Q71 35 73 40L86 72L100 35H115L93 92Q91 97 86 97Q81 97 79 92L64 58L49 92Q47 97 42 97Q37 97 35 92Z" fill="currentColor"/>
			</svg>
		</button>
		<div class="tw5-подсказка"></div>
		<style>
			.tw5-автоперенаправление
			{
				flex: 0 0 auto;
				display: flex;
				align-items: center;
				gap: 4px;
				margin: 0 .5rem;
				position: relative;
			}
			.weave-mode-switch {
				display: flex;
				gap: 2px;
				padding: 2px;
				border-radius: 999px;
				background: var(--color-background-button-text-hover, #303036);
			}
			.weave-mode-switch button {
				display: grid;
				place-items: center;
				width: 24px;
				height: 24px;
				border-radius: 50%;
				color: var(--color-text-base, #fff);
				font-size: 16px;
				line-height: 1;
			}
			.weave-mode-switch button[aria-pressed="true"] {
				background: #0b5c50;
				color: #fff;
			}
			.weave-mode-switch button:focus-visible {
				outline: 2px solid #69e3b5;
				outline-offset: 1px;
			}
			#tw5-автоперенаправление
			{
				align-items: center;
				background-color: var(--color-background-button-text-default);
				border-radius: var(--border-radius-rounded);
				display: flex;
				color: var(--color-fill-button-icon);
				height: var(--button-size-default);
				justify-content: center;
				width: var(--button-size-default);
			}
			#tw5-автоперенаправление:hover
			{
				background-color: var(--color-background-button-text-hover);
				color: var(--color-fill-button-icon-hover);
			}
			#tw5-автоперенаправление:active
			{
				background-color: var(--color-background-button-text-active);
				color: var(--color-fill-button-icon-active);
			}
			#tw5-автоперенаправление > svg
			{
				width: 75%;
			}
			.tw5-запрещено > svg
			{
				opacity: .4;
			}
			.tw5-подсказка
			{
				background-color: var(--color-background-tooltip);
				border-radius: var(--border-radius-medium);
				color: var(--color-text-tooltip);
				display: none;
				font-size: var(--font-size-4);
				font-weight: var(--font-weight-semibold);
				left: 50%;
				line-height: 1.22;
				margin-top: 10px;
				max-width: 25.4rem;
				padding: 6px;
				pointer-events: none;
				position: absolute;
				top: 100%;
				transform: translateX(-50%);
				width: -moz-max-content;
				width: max-content;
				white-space: pre-line;
				z-index: var(--z-index-modal);
			}
			.tw5-подсказка::after
			{
				background-color: inherit;
				border-radius: var(--border-radius-small) 0 0 0;
				content: "";
				height: 6px;
				left: 50%;
				position: absolute;
				top: -3px;
				transform: translateX(-50%) rotate(45deg);
				width: 6px;
				z-index: var(--z-index-below);
			}
			.tw5-автоперенаправление:hover .tw5-подсказка
			{
				display: block;
			}
			.tw5-справка .tw5-подсказка
			{
				background: #f00000;
				color: #fff;
				display: block;
				pointer-events: auto;
			}
		</style>
	</div>
	`);
	const кнопка = обновитьНашуКнопку();
	const group = кнопка.parentElement.querySelector('.weave-mode-switch');
	group.setAttribute('aria-label', м_i18n.GetMessage('J0604'));
	for (const option of group.querySelectorAll('[data-weave-mode]')) {
		const mode = Number(option.dataset.weaveMode);
		const label = м_i18n.GetMessage(PLAYER_MODE_MESSAGES[mode]);
		option.title = label;
		option.setAttribute('aria-label', label);
		option.addEventListener('click', () => setPlayerMode(mode));
	}
	кнопка.addEventListener('click', обработатьЗапускНашегоПроигрывателя);
	кнопка.addEventListener('contextmenu', selectNextPlayerMode);
	if (!м_Настройки.Получить('лАвтоперенаправлениеЗамечено')) {
		кнопка.parentNode.classList.add('tw5-справка');
		кнопка.parentNode.addEventListener('mouseover', обработатьЗакрытиеСправки);
		кнопка.parentNode.addEventListener('touchstart', обработатьЗакрытиеСправки, {
			passive: false
		});
	}
	return true;
}

function разрешитьРаботуЧата() {
	const fGetItem = Storage.prototype.getItem;
	Storage.prototype.getItem = function(сИмя) {
		let сЗначение = fGetItem.apply(this, arguments);
		if (сИмя === 'TwitchCache:Layout' && сЗначение) {
			сЗначение = сЗначение.replace('"isRightColumnClosedByUserAction":true', '"isRightColumnClosedByUserAction":false');
		}
		return сЗначение;
	};
}

function изменитьСтильЧата() {
	const узСтиль = document.createElement('link');
	узСтиль.rel = 'stylesheet';
	узСтиль.href = chrome.runtime.getURL('content.css');
	узСтиль.className = 'tw5-js-удалить';
	(document.head || document.documentElement).appendChild(узСтиль);
}

function изменитьПоведениеЧата() {
	window.addEventListener('click', оСобытие => {
		if (!document.hasFocus()) {
			const {activeElement} = document;
			if (activeElement) {
				if (activeElement.nodeName === 'BODY') {
					activeElement.setAttribute('tabindex', '-1');
					activeElement.focus();
					activeElement.removeAttribute('tabindex');
				} else {
					activeElement.focus();
				}
			}
		}
		if (оСобытие.button !== ЛЕВАЯ_КНОПКА) {
			return;
		}
		const узСсылка = оСобытие.target.closest('a[href^="http:"],a[href^="https:"],a[href]:not([href=""]):not([href^="#"]):not([href*=":"]):not([href$="/not-a-location"])');
		if (!узСсылка) {
			return;
		}
		м_Журнал.Окак(`[content.js] Открываю ссылку в новой вкладке: ${узСсылка.getAttribute('href')}`);
		узСсылка.target = '_blank';
		оСобытие.stopImmediatePropagation();
	}, true);
}

function удалитьХвостыСтаройВерсии() {
	const сузУдалить = document.getElementsByClassName('tw5-js-удалить');
	while (сузУдалить.length !== 0) {
		м_Журнал.Окак(`[content.js] Удаляю ${сузУдалить[0].nodeName} старой версии`);
		сузУдалить[0].remove();
	}
	window.dispatchEvent(new CustomEvent('tw5-неперехватывать'));
}

ДобавитьОбработчикИсключений(() => {
	м_Журнал.Окак(`[content.js] Запущен ${performance.now().toFixed()}мс ${location.href}`);
	if (разобратьАдрес(location).сСтраница === 'ЧАТ_КАНАЛА') {
		вставитьНаСтраницу(разрешитьРаботуЧата);
		if (window.top !== window) {
			изменитьСтильЧата();
			изменитьПоведениеЧата();
		}
		return;
	}
	if (window.top !== window) return;
	удалитьХвостыСтаройВерсии();
	м_Настройки.Восстановить().then(() => {
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area !== 'local' || !Object.hasOwn(changes, PLAYER_MODE_KEY)) return;
			const mode = changes[PLAYER_MODE_KEY].newValue ?? PLAYER_PAGE;
			if (!Number.isInteger(mode) || mode < PLAYER_OFF || mode > PLAYER_PAGE || mode === playerMode()) return;
			м_Настройки.Изменить(PLAYER_MODE_KEY, mode, true);
			cancelPendingLaunch();
			if (mode === PLAYER_OFF) closeEmbeddedPlayer?.();
			обновитьНашуКнопку();
		});
		// Twitch changes the channel through History API without reloading this script.
		observeChannelNavigation();
		window.addEventListener('popstate', observeChannelNavigation);
		window.addEventListener('pageshow', observeChannelNavigation);
		window.setInterval(observeChannelNavigation, 250);
	}).catch(м_Отладка.ПойманоИсключение);
})();