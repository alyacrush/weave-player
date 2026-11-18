'use strict';

if (window.top !== window && new URLSearchParams(location.search).get('embedded') === '1') {
	// Links in the embedded player must leave the playback frame intact.
	const base = document.createElement('base');
	base.target = '_blank';
	document.head.prepend(base);
}
