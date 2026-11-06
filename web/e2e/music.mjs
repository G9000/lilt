// Music window and persistent toolbar playback; no owner data or external account.
import { chromium } from 'playwright-core';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const shots=process.argv[2];
if(shots) await mkdir(shots,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
let browser;
try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:950},reducedMotion:'reduce'});
  // Listen to what the page plays: anything sent to the speakers also goes to an analyser.
  await context.addInitScript(()=>{
    const connect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(dest,...rest){
      if(dest instanceof AudioDestinationNode){
        const ctx=dest.context;
        if(!ctx.__ear){ctx.__ear=ctx.createAnalyser();ctx.__ear.fftSize=2048;window.__ears=[...(window.__ears||[]),ctx.__ear];}
        connect.call(this,ctx.__ear);
      }
      return connect.call(this,dest,...rest);
    };
    window.__hear=async(ms)=>{
      const ears=window.__ears||[], buf=new Float32Array(2048);let rms=0,peak=0,bad=false;
      for(const end=performance.now()+ms;performance.now()<end;await new Promise(r=>setTimeout(r,40)))
        for(const ear of ears){ear.getFloatTimeDomainData(buf);let s=0;for(const v of buf){if(!Number.isFinite(v))bad=true;s+=v*v;peak=Math.max(peak,Math.abs(v));}rms=Math.max(rms,Math.sqrt(s/buf.length));}
      return {rms,peak,bad};
    };
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.fulfill({status:503,json:{error:'Isolated Music test'}}));
  await page.route('https://open.spotify.com/embed/iframe-api/v1',r=>r.fulfill({contentType:'text/javascript',body:`
    window.spotifyProbe={created:0,destroyed:0,paused:0,resumed:0};
    window.onSpotifyIframeApiReady({createController(el,options,ready){
      const events={};let paused=true;
      const emit=()=>events.playback_update?.({data:{isPaused:paused}});
      const ctl={addListener(name,fn){events[name]=fn;},pause(){paused=true;window.spotifyProbe.paused++;emit();},resume(){paused=false;window.spotifyProbe.resumed++;emit();},destroy(){window.spotifyProbe.destroyed++;}};
      window.spotifyProbe.created++;
      const button=document.createElement('button');button.textContent='Play test Spotify';button.onclick=()=>ctl.resume();el.append(button);ready(ctl);
    }});
  `}));
  const root=server.resolvedUrls.local[0];
  await page.goto(root);
  await page.getByRole('button',{name:'Open music player',exact:true}).click();
  await page.waitForFunction(()=>location.hash==='#/music');
  const music=page.locator('.music-window');
  await music.waitFor({state:'visible'});
  assert.equal(await page.locator('.room-music-panel').count(),0,'old popover is removed');
  const title=music.locator('h1');
  const rows=await music.locator('.music-moods button').evaluateAll(buttons=>buttons.map(button=>({
    image:button.querySelector('img').getBoundingClientRect().left,
    title:button.querySelector('b').getBoundingClientRect().left,
  })));
  assert.ok(rows.every(row=>Math.abs(row.image-rows[0].image)<1&&Math.abs(row.title-rows[0].title)<1),'selected and unselected mood rows share aligned artwork and titles');
  assert.equal(await music.locator('.music-cover').count(),0,'square sleeve no longer hides the disc');
  const disc=await music.locator('.music-record').boundingBox();
  assert.ok(disc&&Math.abs(disc.width-disc.height)<1,'full disc remains circular');
  assert.equal(await music.getByRole('button',{name:'Play lo-fi radio',exact:true}).count(),1,'opening never autoplays');
  await music.getByRole('button',{name:'Next mood',exact:true}).click();
  assert.match(await title.textContent(),/Desk lamp/);
  await music.getByRole('button',{name:'Previous mood',exact:true}).click();
  assert.match(await title.textContent(),/Rain on the window/);
  await music.locator('.music-moods').getByRole('button',{name:/Snow day/}).click();
  assert.match(await title.textContent(),/Snow day/);
  assert.equal(await music.getByRole('button',{name:'Play lo-fi radio',exact:true}).count(),1,'choosing a mood does not autoplay');
  await music.locator('.music-moods').getByRole('button',{name:/Rain on the window/}).click();
  await music.getByRole('slider',{name:'Radio volume',exact:true}).fill('27');
  assert.equal(await page.evaluate(()=>localStorage.getItem('lilt.radio.volume')),'0.27');
  await music.getByRole('button',{name:'Mute radio',exact:true}).click();
  assert.equal(await music.getByRole('slider',{name:'Radio volume'}).inputValue(),'0');
  await music.getByRole('button',{name:'Unmute radio',exact:true}).click();
  await music.getByRole('slider',{name:'Radio volume'}).fill('27');
  await music.getByRole('button',{name:'Play lo-fi radio',exact:true}).click();
  await music.getByRole('button',{name:'Pause lo-fi radio',exact:true}).waitFor();
  assert.equal(await music.getByRole('button',{name:/Expand|Restore/}).count(),0,'music has no expand/restore controls');
  // Every mood, the newer ones with their own instruments and places too, plays: sound, no clipping, no broken samples.
  const moods=await music.locator('.music-moods button b').allTextContents();
  assert.ok(moods.length>=17,'the radio has the newer moods too');
  for(const name of moods){
    await music.locator('.music-moods').getByRole('button',{name:new RegExp(name)}).click();
    assert.match(await title.textContent(),new RegExp(name));
    const heard=await page.evaluate(()=>window.__hear(2600));
    assert.ok(heard.rms>0.002&&heard.peak<0.99&&!heard.bad,`${name} plays cleanly: ${JSON.stringify(heard)}`);
    console.log(`PASS ${name} plays — rms ${heard.rms.toFixed(3)}, peak ${heard.peak.toFixed(2)}`);
  }
  await music.locator('.music-moods').getByRole('button',{name:/Rain on the window/}).click();
  if(shots) await page.screenshot({path:path.join(shots,'music-app.png')});
  await music.getByRole('button',{name:'Close Music',exact:true}).click();
  await page.waitForFunction(()=>location.hash==='#/');
  const mini=page.locator('.ds-roomtop .music-mini');
  await mini.waitFor({state:'visible'});
  assert.match(await mini.textContent(),/Rain on the window/);
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.ds')).opacity)===0);
  if(shots) await page.screenshot({path:path.join(shots,'music-mini.png')});
  assert.equal(await music.isVisible(),false);
  // The existing microphone claim must still duck and resume the shared engine.
  await page.evaluate(async()=>{const {claimMic}=await import('/src/micuse.ts');window.releaseMusicMic=claimMic();});
  await page.waitForFunction(()=>document.querySelector('.ds-roomtop .music-mini')?.textContent.includes('Paused while'));
  await page.evaluate(()=>window.releaseMusicMic());
  await mini.getByRole('button',{name:/Pause/}).click();
  await mini.getByRole('button',{name:/Play|Resume/}).waitFor();
  assert.equal(await mini.isVisible(),true,'paused player remains reachable');
  await mini.getByRole('button',{name:/Open Music/}).click();
  await music.waitFor({state:'visible'});
  assert.equal(await music.getByRole('slider',{name:'Radio volume'}).inputValue(),'27');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>location.hash==='#/');
  // Opening from another app must return there without losing playback state.
  await page.evaluate(()=>{location.hash='/photos';});
  await page.locator('.ds-menubar .music-mini').getByRole('button',{name:/Open Music/}).click();
  await music.waitFor({state:'visible'});
  await music.getByRole('button',{name:'Close Music',exact:true}).click();
  await page.waitForFunction(()=>location.hash==='#/photos');
  // Simulated Spotify controller verifies routing never destroys the playing host.
  await page.locator('.ds-menubar .music-mini-open').click();
  await music.getByRole('radio',{name:'Spotify',exact:true}).check();
  await music.getByRole('button',{name:'Or paste a playlist link',exact:true}).click();
  await music.getByRole('button',{name:'lofi beats',exact:true}).click();
  await music.getByRole('button',{name:'Play test Spotify',exact:true}).click();
  await music.getByRole('button',{name:'Close Music',exact:true}).click();
  await page.waitForFunction(()=>location.hash==='#/photos');
  const deskMini=page.locator('.ds-menubar .music-mini');
  await deskMini.getByRole('button',{name:'Pause Spotify',exact:true}).click();
  await deskMini.getByRole('button',{name:'Play Spotify',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.spotifyProbe.destroyed),0,'closing preserves Spotify host');
  await deskMini.locator('.music-mini-open').click();
  await music.getByRole('radio',{name:'Lo-fi',exact:true}).check();
  const pauses=await page.evaluate(()=>window.spotifyProbe.paused);
  assert.ok(pauses>=2,'switching source pauses Spotify');
  await music.getByRole('radio',{name:'Spotify',exact:true}).check();
  assert.equal(await page.evaluate(()=>window.spotifyProbe.created),1,'source changes retain the same Spotify controller');
  await music.getByRole('radio',{name:'Lo-fi',exact:true}).check();
  // Delay AudioContext.resume to reproduce a source change while audio is waking up.
  await page.evaluate(()=>{
    const proto=window.AudioContext.prototype, original=proto.resume;
    proto.resume=function(){const ready=original.call(this);return new Promise(resolve=>{window.finishMusicResume=async()=>{await ready;proto.resume=original;resolve();};});};
  });
  await music.getByRole('button',{name:'Play lo-fi radio',exact:true}).click();
  await music.getByRole('radio',{name:'Spotify',exact:true}).check();
  await page.evaluate(()=>window.finishMusicResume());
  await music.getByRole('radio',{name:'Lo-fi',exact:true}).check();
  assert.equal(await music.getByRole('button',{name:'Play lo-fi radio',exact:true}).count(),1,'late audio resume cannot restart the source that was left');
  await music.getByRole('button',{name:'Close Music',exact:true}).click();
  await page.evaluate(()=>{location.hash='/';});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('group',{name:'Room shortcuts'}).getByRole('button',{name:'Music',exact:true}).click();
  await music.waitFor({state:'visible'});
  const mobile=await music.boundingBox();
  assert.ok(mobile.x>=0&&mobile.x+mobile.width<=390&&mobile.y>=0&&mobile.y+mobile.height<=844,'music fits a phone');
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
  if(shots) await page.screenshot({path:path.join(shots,'music-mobile-dark.png')});
  await music.getByRole('button',{name:'Close Music',exact:true}).click();
  await page.waitForFunction(()=>location.hash==='#/');
  const compact=await mini.boundingBox();
  assert.ok(compact.x>=0&&compact.x+compact.width<=390,'mini player remains within phone top bar');
  assert.equal(await page.locator('.ds-roomtop').evaluate(el=>el.scrollWidth<=window.innerWidth),true,'phone top bar does not overflow');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1440,height:950});
  await page.getByRole('button',{name:'Open music player',exact:true}).click();
  await music.waitFor({state:'visible'});
  await music.getByRole('button',{name:'Close Music',exact:true}).click();
  await page.waitForFunction(()=>location.hash==='#/'&&document.activeElement?.classList.contains('room-music'));
  assert.deepEqual(errors,[]);
  console.log('PASS: Music app navigation, aligned mood rows, no autoplay, controls, persistent mini player, microphone ducking and phone layout.');
} finally {await browser?.close();await server.close();}
