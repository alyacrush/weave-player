'use strict';
const probeTabs = new Set();
const records = new Map();
chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({url: chrome.runtime.getURL('probe.html')}, tab => probeTabs.add(tab.id));
});
chrome.tabs.onRemoved.addListener(id => { probeTabs.delete(id); records.delete(id); });
// Read-only observer: no blocking permission, return value or header changes.
chrome.webRequest.onHeadersReceived.addListener(details => {
  if (!probeTabs.has(details.tabId)) return;
  const headers = details.responseHeaders.filter(h =>
    ['content-security-policy', 'x-frame-options'].includes(h.name.toLowerCase())
  ).map(h => ({name: h.name, value: h.value}));
  const list = records.get(details.tabId) || [];
  list.push({status: details.statusCode, path: new URL(details.url).pathname, headers});
  records.set(details.tabId, list.slice(-20));
}, {urls: ['https://www.twitch.tv/*'], types: ['sub_frame']}, ['responseHeaders']);
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.url === chrome.runtime.getURL('probe.html') && probeTabs.has(message.tabId)) {
    if (message.type === 'clear') { records.set(message.tabId, []); reply(true); }
    if (message.type === 'read') reply(records.get(message.tabId) || []);
    return;
  }
  if (!sender.tab || !probeTabs.has(sender.tab.id)) return;
  if (message.type === 'document-ready' && sender.frameId > 0 &&
      new URL(sender.url).origin === 'https://www.twitch.tv') {
    const list = records.get(sender.tab.id) || [];
    list.push({documentReady: true, path: new URL(sender.url).pathname});
    records.set(sender.tab.id, list.slice(-20));
  }
});
