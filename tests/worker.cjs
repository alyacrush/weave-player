const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const messages=[];
const context=vm.createContext({performance,console, navigator:{userAgent:'Firefox/130.0'},
 postMessage:m=>messages.push(structuredClone(m)),
 fetch:async path=>({arrayBuffer:async()=>ab(fs.readFileSync('addon/'+path))})});
context.self=context;
context.importScripts=path=>vm.runInContext(fs.readFileSync('addon/'+path,'utf8'),context,{filename:path});
vm.runInContext(fs.readFileSync('addon/worker.js','utf8'),context,{filename:'worker.js'});
function send(data) {context.onmessage({data})}
function fmp4(n,broken=false){send({чНомер:n,чДлительность:2,лРазрыв:broken,fmp4Init:ab(fs.readFileSync('tests/fixtures/init.mp4')),fmp4Codecs:'avc1.42c00d,mp4a.40.2',пДанные:ab(fs.readFileSync('tests/fixtures/live'+(n%3)+'.m4s'))})}
setTimeout(()=>{
 try{
 send({чНомер:1,пДанные:2});
 fmp4(2); fmp4(3); fmp4(4,true);
 send({чНомер:5,пДанные:9});
 send({чНомер:6,чДлительность:6,лРазрыв:true,пДанные:ab(fs.readFileSync('tests/fixtures/legacy.ts'))});
 fmp4(7);
 const errors=messages.filter(m=>m[0]===3||m[0]===4); assert.deepEqual(errors,[]);
 const results=messages.filter(m=>m[0]===1).map(m=>m[1]);
 assert.equal(results.length,7);
 assert.equal(results[1].лРазрыв,true); assert.equal(results[2].лРазрыв,false); assert.equal(results[3].лРазрыв,true);
 assert.ok(results[5].пДанные.мбМедиасегмент); assert.equal(results[6].лРазрыв,true);
 const first=results[1].пДанные;
 fs.writeFileSync('tests/fixtures/processed.mp4',Buffer.concat([Buffer.from(first.мбСегментИнициализации),Buffer.from(first.мбМедиасегмент)]));
 console.log('PASS: actual worker compilation, fMP4 continuity/discontinuity, fMP4 → MPEG-TS → fMP4, original TS transmuxing');
 }catch(e){console.error(e);console.error(messages.filter(m=>m[0]===3||m[0]===4));process.exitCode=1}
},100);
