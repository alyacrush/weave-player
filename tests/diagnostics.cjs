const assert=require('assert/strict');
const {createReport}=require('../addon/diagnostics.js');
const report=createReport('2026.11.14.1','Firefox/130.0 secret-token example.invalid','https://secret.invalid/?token=abc');
assert.deepEqual(report,{schema:1,extensionVersion:'2026.11.14.1',firefoxVersion:'130.0',category:'error'});
assert.deepEqual(createReport('secret','secret','feedback'),{schema:1,extensionVersion:'unknown',firefoxVersion:'unknown',category:'feedback'});
console.log('PASS: diagnostic allowlist excludes arbitrary strings, URLs and tokens');
