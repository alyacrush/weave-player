'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync('addon/autoclaim.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('addon/manifest.json', 'utf8'));
const match = manifest.content_scripts.find(entry => entry.js.includes('autoclaim.js'));
assert.ok(match);
assert.deepEqual(match.matches, ['https://www.twitch.tv/*']);
assert.notEqual(match.all_frames, true);

const setting = 'autoClaimChannelPoints';
let change;
let readInitial;
let clicks = 0;
let hidden = false;
let disabled = false;
let ariaDisabled = false;
let bonusAvailable = true;
let searches = 0;
const timers = new Map();
let timerId = 0;
const button = {
	get disabled() { return disabled; },
	getAttribute(name) {
		assert.equal(name, 'aria-disabled');
		return ariaDisabled ? 'true' : null;
	},
	getClientRects() { return hidden ? [] : [{}]; },
	click() { clicks++; }
};
vm.runInNewContext(script, {
	chrome: {
		runtime: {},
		storage: {
			onChanged: {addListener(handler) { change = handler; }},
			local: {get(key, done) { assert.equal(key, setting); readInitial = done; }}
		}
	},
	document: {
		querySelector(selector) {
			assert.match(selector, /claimable-bonus__icon/);
			searches++;
			return bonusAvailable ? {closest(tag) { assert.equal(tag, 'button'); return button; }} : null;
		}
	},
	setInterval(fn, interval) {
		assert.equal(interval, 5000);
		timers.set(++timerId, fn);
		return timerId;
	},
	clearInterval(id) { assert.ok(timers.delete(id)); }
});
const set = (newValue, area = 'local') => change({[setting]: {newValue}}, area);
const tick = () => { for (const event of timers.values()) event(); };

readInitial({});
set(true, 'sync');
set('true');
assert.equal(timers.size, 0);
assert.equal(searches, 0);

set(true);
assert.equal(timers.size, 1);
assert.equal(clicks, 1);
set(true);
assert.equal(timers.size, 1);
assert.equal(clicks, 1);

hidden = true;
tick();
hidden = false;
disabled = true;
tick();
disabled = false;
ariaDisabled = true;
tick();
ariaDisabled = false;
bonusAvailable = false;
tick();
assert.equal(clicks, 1);

bonusAvailable = true;
tick();
assert.equal(clicks, 2);
set(undefined);
assert.equal(timers.size, 0);
readInitial({[setting]: true});
tick();
assert.equal(clicks, 2);

console.log('PASS: optional Twitch bonuses, visible button only, and live disable');
