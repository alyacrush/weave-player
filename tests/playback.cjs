const {chromium,firefox}=require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fs=require('fs');
(async()=>{
 const useFirefox=process.env.WEAVE_TEST_BROWSER==='firefox';
 const browser=useFirefox?await firefox.launch():await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try {
 const page=await browser.newPage();
 await page.setContent('<video muted></video>');
 await page.addScriptTag({path:'addon/fmp4.js'});
 const result=await page.evaluate(async data=>{
  const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;
  const v=document.querySelector('video'),m=new MediaSource();v.src=URL.createObjectURL(m);
  await new Promise(r=>m.addEventListener('sourceopen',r,{once:true}));
  const processor=Fmp4.createProcessor(); let b;
  const append=x=>new Promise((resolve,reject)=>{b.addEventListener('updateend',resolve,{once:true});b.addEventListener('error',()=>reject(new Error('MSE append failed')),{once:true});b.appendBuffer(x)});
  for(const media of data.media){
   const s=processor.process({fmp4Init:decode(data.init),fmp4Codecs:'avc1.42c00d,mp4a.40.2',пДанные:decode(media),лРазрыв:false},false);
   if(!b)b=m.addSourceBuffer(s.пДанные.сКодеки);
   if(s.пДанные.мбСегментИнициализации)await append(s.пДанные.мбСегментИнициализации);
   await append(s.пДанные.мбМедиасегмент);
  }
  m.endOfStream();await v.play();
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Playback timeout')),5000); const check=()=>{if(v.currentTime>.3&&v.videoWidth){clearTimeout(timer);resolve()}else requestAnimationFrame(check)};check()});
  return {width:v.videoWidth,height:v.videoHeight,time:v.currentTime,buffered:b.buffered.end(0),error:v.error};
 },{init:fs.readFileSync('tests/fixtures/init.mp4').toString('base64'),media:[0,1,2].map(i=>fs.readFileSync('tests/fixtures/live'+i+'.m4s').toString('base64'))});
 console.log('PASS: '+(useFirefox?'Firefox':'Chromium')+' MSE playback',result);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
