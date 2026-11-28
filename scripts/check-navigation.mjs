// Browser regressions for issues #1 and #13. Chromium and dedicated demo Auth/Firestore must already be running/available.
// Build with explicit local emulator endpoints, seed only that demo, then run:
// node scripts/check-navigation.mjs DIST OUTPUT [--auth-port 49199] [--vp 412x915] [--theme light|dark] [--reduced] [--measure] [--labels-only]
// Never point DIST at a cloud/hybrid build. No personal data or external network is needed.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync,mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import {tmpdir} from 'node:os';
const opt=(name,fallback)=>{const index=process.argv.indexOf('--'+name);return index<0?fallback:process.argv[index+1];};
const dist=process.argv[2];
assert.ok(dist,'Pass an emulator-mode web build directory');
const out=process.argv[3]??mkdtempSync(join(tmpdir(),'nummo-navigation-results-'));mkdirSync(out,{recursive:true});
const [width,height]=opt('vp','412x915').split('x').map(Number);
const theme=opt('theme','light'), reduced=process.argv.includes('--reduced'), authPort=Number(opt('auth-port','49199'));
assert.ok(width>0&&width<600&&height>0,'This regression targets compact navigation');
assert.ok(Number.isInteger(authPort)&&authPort>0&&authPort<=65535);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=createServer((req,res)=>{let p=join(dist,new URL(req.url,'http://x').pathname);if(!existsSync(p)||statSync(p).isDirectory())p=join(dist,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'})[extname(p)]??'application/octet-stream');res.end(readFileSync(p));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const profile=mkdtempSync(join(tmpdir(),'nummo-issue1-chrome-'));
const child=spawn('chromium',['--headless=new','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--hide-scrollbars','about:blank'],{stdio:'ignore'});
let socket;
try {
  for(let i=0;i<80&&!existsSync(join(profile,'DevToolsActivePort'));i++)await sleep(100);
  const port=readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json();socket=new WebSocket(tabs.find(x=>x.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>socket.onopen=r);let id=0;const pending=new Map();const errors=[];
  socket.onmessage=e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p?.reject(new Error(JSON.stringify(d.error))):p?.resolve(d.result);}else if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});socket.send(JSON.stringify({id:i,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
  await send('Page.enable');await send('Runtime.enable');
  await send('Network.enable');await send('Network.setBlockedURLs',{urls:['https://*']});
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2.625,mobile:true});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await send('Emulation.setCPUThrottlingRate',{rate:4});
  const login=await(await fetch(`http://127.0.0.1:${authPort}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestUri:'http://localhost',returnSecureToken:true,postBody:'id_token='+encodeURIComponent(JSON.stringify({sub:'100000000000000000001',email:'proprietario@example.com',email_verified:true}))+'&providerId=google.com'})})).json();
  if(!login.idToken)throw new Error('Demo login failed');
  const user={uid:login.localId,email:login.email,emailVerified:true,isAnonymous:false,providerData:[{providerId:'google.com',uid:'100000000000000000001',email:login.email,displayName:null,phoneNumber:null,photoURL:null}],stsTokenManager:{refreshToken:login.refreshToken,accessToken:login.idToken,expirationTime:Date.now()+3600e3},createdAt:String(Date.now()),lastLoginAt:String(Date.now()),apiKey:'demo-key',appName:'[DEFAULT]'};
  await send('Page.navigate',{url:origin+'/manifest.webmanifest'});await sleep(500);
  await evaluate(`localStorage.setItem('firebase:authUser:demo-key:[DEFAULT]',${JSON.stringify(JSON.stringify(user))});localStorage.setItem('nummo.preferences.v1',JSON.stringify({theme:${JSON.stringify(theme)},language:'it',colorMode:'mono',accent:'mint'}));true`);
  await send('Page.navigate',{url:origin});
  for(let i=0;i<80;i++){if(await evaluate(`!![...document.querySelectorAll('[role=navigation]')].find(n=>!n.closest('[inert]'))&&!![...document.querySelectorAll('[role=button]')].find(n=>n.textContent==='Salva')`))break;await sleep(250);}
  await sleep(1500);
  const rects=()=>evaluate(`(()=>{const nav=[...document.querySelectorAll('[role=navigation]')].find(n=>!n.closest('[inert]'));return [...nav.querySelectorAll('[role=button]')].map(n=>{const r=n.getBoundingClientRect();return {label:n.textContent,x:r.x+r.width/2,y:r.y+r.height/2}})})()`);
  const touch=async(type,x,y)=>send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:2,radiusY:2,force:1}]});
  const selected=()=>evaluate(`document.querySelector('[role=navigation] [aria-current=page]')?.textContent`);
  // Concurrent rendering may commit after the animation duration on a throttled CPU. Wait for state, not a fixed frame count.
  const waitForSelection=async label=>{for(let i=0;i<100;i++){if(await selected()===label)return;await sleep(50);}assert.equal(await selected(),label,'Navigation must commit within 5 seconds');};
  const tap=async i=>{const r=(await rects())[i];await touch('touchStart',r.x,r.y);await sleep(50);await touch('touchEnd',r.x,r.y);await sleep(500);await waitForSelection(r.label);};
  // Optional diagnostic measurement: three rounds, first visit separate from subsequent visits.
  // rAF gaps measure main-thread availability, not the compositor's displayed frame rate.
  if(process.argv.includes('--measure')){
  const results=[];
  await evaluate(`window.__long=[];new PerformanceObserver(l=>window.__long.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true})`);
  for(let round=0;round<3;round++)for(const label of ['Uscite','Analisi','Fondi','Liste']){
    const result=await evaluate(`new Promise(resolve=>{const frames=[];const start=performance.now();const begin=window.__long.length;let last=start,committedAt=null;const tick=now=>{frames.push(now-last);last=now;if(committedAt===null&&document.querySelector('[role=navigation] [aria-current=page]')?.textContent===${JSON.stringify(label)})committedAt=performance.now()-start;if((committedAt===null||now-start<committedAt+500)&&now-start<10000)requestAnimationFrame(tick);else resolve({committedAt,label:${JSON.stringify(label)},round:${round},elapsed:now-start,maxFrame:Math.max(...frames),slowFrames:frames.filter(x=>x>34).length,longTasks:window.__long.slice(begin),frames});};requestAnimationFrame(tick);[...document.querySelectorAll('[role=navigation] [role=button]')].find(n=>n.textContent===${JSON.stringify(label)}).click();})`);
    assert.notEqual(result.committedAt,null,'The measured destination must actually open');
    results.push(result);await sleep(150);
  }
  writeFileSync(join(out,'performance.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({navigationPerformance:results.map(({frames,...r})=>r)}));
  }
  if (process.argv.includes('--labels-only')) {
    const measurements = [];
    for (const font of ['google', 'system']) for (const language of ['it', 'en']) {
      await evaluate(`localStorage.setItem('nummo.preferences.v1',JSON.stringify({...JSON.parse(localStorage.getItem('nummo.preferences.v1')),font:${JSON.stringify(font)},language:${JSON.stringify(language)}}));true`);
      await send('Page.reload');
      for (let i=0;i<100;i++) {
        if (await evaluate(`!!document.querySelector('[role=navigation] [role=button]')`)) break;
        await sleep(100);
      }
      await evaluate('document.fonts.ready.then(()=>true)');
      for (const w of [320,360,379,380,390,412]) {
        await send('Emulation.setDeviceMetricsOverride',{width:w,height,deviceScaleFactor:2.625,mobile:true});
        await sleep(300);
        // New expense has no round action; Analysis has it, and uses the active bold label.
        for (const page of ['new', 'dashboard']) {
          await evaluate(page === 'new'
            ? `document.querySelector('[role=banner] [role=button]').click()`
            : `document.querySelector('[role=navigation]').querySelectorAll('[role=button]')[1].click()`);
          await sleep(700);
          const rows = await evaluate(`(()=>{
            const nav=document.querySelector('[role=navigation]');
            return [...nav.querySelectorAll('[role=button]')].map(button=>{
              const label=button.lastElementChild;
              const range=document.createRange();range.selectNodeContents(label);
              const text=range.getBoundingClientRect(),box=button.getBoundingClientRect(),style=getComputedStyle(label);
              return {label:label.textContent,left:text.left,right:text.right,width:text.width,slotLeft:box.left,slotRight:box.right,slotWidth:box.width,height:box.height,overflow:getComputedStyle(button).overflow,fontSize:style.fontSize};
            });
          })()`);
          for (const row of rows) {
            const context=JSON.stringify({w,font,language,page,...row});
            assert.ok(row.left>=row.slotLeft-.5 && row.right<=row.slotRight+.5,'Full label must fit its button: '+context);
            assert.ok(Math.abs((row.left+row.right-row.slotLeft-row.slotRight)/2)<1,'Label must be centred: '+context);
            assert.equal(row.overflow,'visible','Rounded buttons must not clip the bottom corners of the label: '+context);
            assert.ok(row.slotWidth>=48 && row.height>=48,'Touch target must remain usable: '+context);
          }
          assert.equal(new Set(rows.map(row=>row.fontSize)).size,1,'All labels use the same size');
          measurements.push({w,font,language,page,rows});
          if(w===320 && page==='dashboard')await send('Page.captureScreenshot',{format:'png'}).then(r=>writeFileSync(join(out,`labels-320-${font}-${language}.png`),Buffer.from(r.data,'base64')));
        }
      }
      await send('Page.captureScreenshot',{format:'png'}).then(r=>writeFileSync(join(out,`labels-${font}-${language}.png`),Buffer.from(r.data,'base64')));
    }
    writeFileSync(join(out,'labels.json'),JSON.stringify(measurements,null,2));
    assert.equal(errors.length,0,'No uncaught browser exceptions');
    console.log(JSON.stringify({labelChecks:measurements.length,errors,out}));
  } else {
  await tap(0);
  await evaluate(`window.__frames=[];window.__record=true;(()=>{const tick=()=>{if(window.__record){const nav=[...document.querySelectorAll('[role=navigation]')].find(n=>!n.closest('[inert]'));const main=[...document.querySelectorAll('[role=main]')].find(n=>!n.closest('[inert]'));const indicator=nav.firstElementChild;const nr=nav.getBoundingClientRect(),ir=indicator.getBoundingClientRect();window.__frames.push({t:performance.now(),main:getComputedStyle(main).opacity,transform:getComputedStyle(main).transform,navLeft:nr.left,navRight:nr.right,indicatorLeft:ir.left,indicatorRight:ir.right,buttons:[...nav.querySelectorAll('[role=button]')].map(b=>{const s=getComputedStyle(b.firstElementChild);return {name:b.textContent,current:b.getAttribute('aria-current'),color:s.backgroundColor,opacity:s.opacity}})});}requestAnimationFrame(tick)};tick()})()`);
  const rows=await rects();await touch('touchStart',rows[0].x,rows[0].y);await sleep(70);
  for(let i=1;i<=12;i++){await touch('touchMove',rows[0].x+(rows[2].x-rows[0].x)*i/12,rows[0].y);await sleep(16);}
  await send('Page.captureScreenshot',{format:'png'}).then(r=>writeFileSync(join(out,'drag.png'),Buffer.from(r.data,'base64')));
  await touch('touchEnd',rows[2].x,rows[2].y);await waitForSelection('Fondi');await sleep(550);
  const frames=await evaluate('window.__record=false;window.__frames');
  writeFileSync(join(out,'frames.json'),JSON.stringify(frames,null,2));
  await send('Page.captureScreenshot',{format:'png'}).then(r=>writeFileSync(join(out,'after.png'),Buffer.from(r.data,'base64')));
  const painted=frames.filter(f=>f.buttons.some(b=>b.name==='Fondi'&&b.current==='page')&&f.buttons.some(b=>b.name==='Uscite'&&b.color!=='rgba(0, 0, 0, 0)'&&Number(b.opacity)>.01));
  assert.equal(painted.length,0,'Drag origin must not flash again at release (issue #1)');
  assert.equal(await selected(),'Fondi','A drag commits its destination once');
  if(reduced)assert.ok(frames.every(f=>Number(f.main)===1),'Reduced motion must not fade the page');
  // Touch feedback must return on the next ordinary press, including a small movement below the drag threshold.
  let r=(await rects())[1];await touch('touchStart',r.x,r.y);await sleep(350);
  assert.ok(await evaluate(`Number(getComputedStyle(document.querySelector('[role=navigation]').querySelectorAll('[role=button]')[1].firstElementChild).opacity)>.05`),'Normal press feedback must recover after a drag');
  await touch('touchMove',r.x+4,r.y);await touch('touchEnd',r.x+4,r.y);await waitForSelection('Analisi');await sleep(400);
  assert.equal(await selected(),'Analisi','A 4 px movement stays a tap');
  // Reverse direction, returning to the starting slot, pointer cancellation and repeated quick gestures.
  const drag=async(from,to,cancel=false,settle=300)=>{const points=await rects();await touch('touchStart',points[from].x,points[from].y);for(let i=1;i<=8;i++){await touch('touchMove',points[from].x+(points[to].x-points[from].x)*i/8,points[from].y);await sleep(12);}if(cancel)await send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else await touch('touchEnd',points[to].x,points[to].y);await sleep(settle);if(settle>=300)await waitForSelection(points[cancel?from:to].label);};
  await drag(1,3);assert.equal(await selected(),'Liste');await drag(3,0);assert.equal(await selected(),'Uscite');
  const p=await rects();await touch('touchStart',p[0].x,p[0].y);await touch('touchMove',p[2].x,p[2].y);await touch('touchMove',p[0].x,p[0].y);await touch('touchEnd',p[0].x,p[0].y);await sleep(300);assert.equal(await selected(),'Uscite');
  await drag(0,2,true);assert.equal(await selected(),'Uscite','Cancellation must preserve the selection');
  // Keyboard activation directly after a drag must regain both pressed feedback and navigation.
  await evaluate(`document.querySelector('[role=navigation]').querySelectorAll('[role=button]')[2].focus({preventScroll:true})`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await sleep(350);
  assert.ok(await evaluate(`Number(getComputedStyle(document.querySelector('[role=navigation]').querySelectorAll('[role=button]')[2].firstElementChild).opacity)>.05`),'Keyboard press feedback must recover after a drag');
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await waitForSelection('Fondi');await sleep(400);assert.equal(await selected(),'Fondi');
  await drag(2,0);
  await evaluate(`document.querySelector('[role=navigation]').querySelectorAll('[role=button]')[1].focus({preventScroll:true})`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await sleep(350);
  assert.ok(await evaluate(`Number(getComputedStyle(document.querySelector('[role=navigation]').querySelectorAll('[role=button]')[1].firstElementChild).opacity)>.05`),'Enter feedback must recover after a drag');
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await waitForSelection('Analisi');await sleep(400);assert.equal(await selected(),'Analisi');
  // Rapid reversals during the spring must settle on the final destination.
  await drag(1,0,false,40);await drag(0,3,false,400);assert.equal(await selected(),'Liste');
  const viewport=await evaluate('({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
  assert.equal(viewport.scroll,viewport.client,'Navigation must not widen the viewport');assert.equal(errors.length,0,'No uncaught browser exceptions');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await sleep(500);
  const desktop=await evaluate(`(()=>{const n=[...document.querySelectorAll('[role=navigation] [role=button]')].find(n=>n.textContent==='Uscite');const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...desktop});await send('Input.dispatchMouseEvent',{type:'mousePressed',...desktop,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...desktop,button:'left',clickCount:1});await waitForSelection('Uscite');await sleep(400);
  assert.equal(await selected(),'Uscite','Desktop drawer navigation still works');
  assert.equal(await evaluate('document.documentElement.scrollWidth'),1280);assert.equal(errors.length,0);
  console.log(JSON.stringify({width,height,theme,reduced,frames:frames.length,sourcePressFrames:painted.length,minMainOpacity:Math.min(...frames.map(f=>Number(f.main))),indicatorOutsideFrames:frames.filter(f=>f.indicatorLeft<f.navLeft||f.indicatorRight>f.navRight).length,regressions:'drag/reverse/return/cancel/tap/keyboard/rapid/desktop passed',errors,viewport,out}));
  }
} finally {socket?.close();child.kill('SIGTERM');server.close();}
