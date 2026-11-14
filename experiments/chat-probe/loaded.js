'use strict';
if (window !== window.top) chrome.runtime.sendMessage({type: 'document-ready'}, () => { void chrome.runtime.lastError; });
