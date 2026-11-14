'use strict';
const $ = id => document.getElementById(id);
function send(message, callback) {
  chrome.tabs.getCurrent(tab => chrome.runtime.sendMessage({...message, tabId: tab.id}, callback));
}
$('start').addEventListener('click', () => {
  const channel = $('channel').value.trim().toLowerCase();
  if (!/^[a-z0-9_]{1,25}$/.test(channel)) { $('report').textContent = 'Проверьте имя канала.'; return; }
  const mode = $('mode').value;
  const url = new URL(`https://www.twitch.tv/${mode === 'popout' ? 'popout' : 'embed'}/${channel}/chat`);
  if (mode !== 'popout') url.searchParams.set('parent', mode === 'localhost' ? 'localhost' : location.hostname);
  send({type: 'clear'}, () => {
    $('container').textContent = '';
    const frame = document.createElement('iframe');
    frame.title = 'Twitch chat compatibility test'; frame.src = url.href;
    $('container').appendChild(frame);
    $('report').textContent = `Вариант: ${mode}\nFirefox: ${(navigator.userAgent.match(/Firefox\/[\d.]+/) || ['unknown'])[0]}\nПроверьте чат, затем нажмите «Показать диагностику».`;
  });
});
$('read').addEventListener('click', () => {
  send({type: 'read'}, rows => {
    $('report').textContent = JSON.stringify({mode: $('mode').value, firefox: (navigator.userAgent.match(/Firefox\/[\d.]+/) || ['unknown'])[0], observations: rows || []}, null, 2);
  });
});
