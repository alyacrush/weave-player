const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const F = require('../addon/fmp4.js');
const ab = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const init = fs.readFileSync('tests/fixtures/init.mp4');
const media = fs.readFileSync('tests/fixtures/live0.m4s');
const segment = () => ({fmp4Init: ab(init), fmp4Codecs:'avc1.42c00d,mp4a.40.2', пДанные: ab(media), лРазрыв:false});
const p = F.createProcessor();
let out = p.process(segment(), false);
assert.equal(out.лРазрыв,true); assert.equal(out.пДанные.чШиринаКартинки,320);
assert.equal(out.пДанные.чЧастотаДискретизации,48000);
assert.deepEqual(Buffer.from(out.пДанные.мбМедиасегмент),media);
assert.deepEqual(Buffer.from(out.пДанные.мбСегментИнициализации),init);
assert.equal(p.process(segment(),false).пДанные.мбСегментИнициализации,undefined);
assert.equal(p.process(segment(),true).лРазрыв,true);
p.reset(); assert.equal(p.process(segment(),false).лРазрыв,true);
let changed=segment();let bytes=new Uint8Array(changed.fmp4Init); const at=init.indexOf(Buffer.from('avcC'));bytes[at+7]++;
assert.equal(p.process(changed,false).лРазрыв,true);
assert.throws(()=>F.boxes(new Uint8Array([0,0,0,99,102,116,121,112])),/Invalid/);
assert.throws(()=>F.initInfo(init.subarray(0,30),'mp4a.40.2'));
const encrypted=Buffer.from(init); encrypted.write('encv',encrypted.indexOf(Buffer.from('avc1')));
assert.throws(()=>F.initInfo(encrypted,'mp4a.40.2'),/Encrypted/);
assert.throws(()=>p.process({...segment(),пДанные:new ArrayBuffer(0)},false),/Missing/);
// Exercise the actual playlist parser, without browser startup side effects.
const src=fs.readFileSync('addon/player.js','utf8');
const code=src.slice(src.indexOf('\tfunction РазобратьСписок('), src.indexOf('\tfunction задатьСостояниеРекламы('));
const noop=()=>{};
let fatal;
const ctx={URL,Date,Map,Math,Number, Error, Проверить: n=>assert.ok(n), ResolveRelativeUrl:(a,b)=>new URL(a,b).href,
 м_Журнал:new Proxy({}, {get:()=>noop}), м_Статистика:{РазобранСписокСегментов:noop},
 м_Отладка:{ЗавершитьРаботуИПоказатьСообщение:code=>{fatal=code;throw new Error(code)}},
 м_Twitch:{этоРекламныйСегмент:()=>false,ПолучитьАдресКанала:()=>'',сортироватьСписокВариантов:x=>x},
 м_i18n:{ФорматироватьЧисло:()=>''},Текст:()=>''};
vm.createContext(ctx);vm.runInContext('let _чИдСессии=1;'+code+';this.parse=РазобратьСписок;',ctx);
const prefix='#EXTM3U\n#EXT-X-TARGETDURATION:2\n';
const end='#EXTINF:2,live\nchunk.m4s\n';
const parse=s=>ctx.parse(false,'https://test.invalid/live/index.m3u8',s);
assert.equal(parse(prefix+'#EXT-X-MAP:URI="init.mp4"\n'+end).моСегменты[0].fmp4Map,'https://test.invalid/live/init.mp4');
assert.equal(parse(prefix+'#EXT-X-KEY:METHOD=NONE\n'+end).моСегменты[0].fmp4Map,null);
assert.equal(parse(prefix+end).моСегменты[0].сАдрес,'https://test.invalid/live/chunk.m4s');
parse(prefix+'#EXT-X-KEY:METHOD=AES-128,URI="key"\n'+end); assert.equal(fatal,'J0219');
parse(prefix+'#EXT-X-MAP:URI="init.mp4",BYTERANGE="10@0"\n'+end); assert.equal(fatal,'J_FMP4_UNSUPPORTED');
const maps=parse(prefix+'#EXT-X-MAP:URI="one.mp4"\n'+end+'#EXT-X-DISCONTINUITY\n#EXT-X-MAP:URI="two.mp4"\n'+end).моСегменты;
assert.equal(maps[0].fmp4Map,'https://test.invalid/live/one.mp4'); assert.equal(maps[1].лРазрыв,true);
assert.equal(maps[1].fmp4Map,'https://test.invalid/live/two.mp4');
// User playlist regression, without copying URLs/tokens into the deliverable.
if(fs.existsSync('upload/Вставленный текст(5).txt')) {
 const real=parse(fs.readFileSync('upload/Вставленный текст(5).txt','utf8'));
 assert.equal(real.моСегменты.length,15); assert.ok(real.моСегменты.every(s=>s.fmp4Map));
 const master=ctx.parse(true,'https://test.invalid/master.m3u8',fs.readFileSync('upload/Вставленный текст(6).txt','utf8'));
 assert.equal(master.моВарианты[0].fmp4Codecs,'avc1.4D402A,mp4a.40.2');
}
console.log('PASS: fMP4 metadata/bytes/discontinuities/reset, malformed/encrypted input, HLS MAP/KEY, legacy playlists');
