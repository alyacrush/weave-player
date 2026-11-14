'use strict';
const WeaveDiagnostics = (() => {
    function createReport(version, userAgent, category) {
        const browser = /Firefox\/(\d+(?:\.\d+)*)/.exec(String(userAgent));
        return {
            schema: 1,
            extensionVersion: /^\d+(?:\.\d+){1,3}$/.test(String(version)) ? String(version) : 'unknown',
            firefoxVersion: browser ? browser[1] : 'unknown',
            category: category === 'feedback' ? 'feedback' : 'error'
        };
    }
    return {createReport};
})();
if (typeof module !== 'undefined') module.exports = WeaveDiagnostics;
