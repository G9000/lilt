// Real painted room and customization controls, without accessing practice data.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const shots = process.argv[2];
if (shots) await mkdir(shots, {recursive:true});
const server = await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
let browser;
try {
  browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:950}, reducedMotion:'reduce'});
  const page = await context.newPage();
  const errors=[], api=[];
  const oldCatRequests=[];
  page.on('request',r=>{if(/cat-(body|tail|ear)-/.test(r.url())) oldCatRequests.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>{api.push(r.request().url());return r.abort();});
  const url=`${server.resolvedUrls.local[0]}e2e/fixtures/room-appearance.html`;
  await page.goto(url);
  await page.getByRole('button',{name:'Make it yours',exact:true}).click();
  await page.getByRole('radio',{name:'Night',exact:true}).check();
  assert.equal(await page.locator('.room-paint').getAttribute('data-light'),'night');
  assert.equal(await page.locator('img[src="room/room-night-v3.webp"]').evaluate(el=>el.style.opacity),'1');
  await page.waitForFunction(()=>[...document.querySelectorAll('.room-art')].every(im=>im.complete&&im.naturalWidth));
  const canvas = page.locator('.room-fx');
  const unlit=await canvas.evaluate(c=>c.toDataURL());
  await page.getByRole('radio',{name:'On',exact:true}).check();
  assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),unlit,'fairy lights change actual scene pixels with motion reduced');
  await page.getByRole('slider',{name:'Warmth'}).fill('65');
  assert.ok(Number(await page.locator('.room-color-wash').evaluate(el=>el.style.opacity))>0);
  await page.getByRole('group',{name:'Side monitor',exact:true}).getByRole('radio',{name:'Leaves',exact:true}).check();
  await page.getByRole('group',{name:'Main monitor',exact:true}).getByRole('radio',{name:'Stars',exact:true}).check();
  assert.equal(await page.locator('[data-monitor="side"]').getAttribute('src'),'pictures/plant-fern.webp');
  assert.equal(await page.locator('[data-monitor="main"]').getAttribute('src'),'pictures/nebula-cliffs.webp');
  await page.getByRole('radio',{name:'Sunset',exact:true}).check();
  if(shots) await page.screenshot({path:path.join(shots,'room-customize.png')});
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button',{name:'Make it yours',exact:true}).evaluate(el=>el===document.activeElement),true);
  if(shots) await page.screenshot({path:path.join(shots,'room-sunset.png')});
  await page.reload();
  await page.getByRole('button',{name:'Make it yours',exact:true}).click();
  assert.equal(await page.locator('.room-paint').getAttribute('data-light'),'sunset');
  assert.equal(await page.getByRole('slider',{name:'Warmth'}).inputValue(),'65');
  assert.equal(await page.locator('.room-monitor-art').count(),2);
  assert.equal(await page.getByRole('group',{name:'Main monitor',exact:true}).getByRole('radio',{name:'Stars',exact:true}).isChecked(),true);
  for(const width of [390,768]) {
    await page.setViewportSize({width,height:844});
    for(const name of ['Reset room','Night','Leaves']) {
      const control=name==='Reset room' ? page.getByRole('button',{name,exact:true}) : (name==='Leaves' ? page.getByRole('group',{name:'Side monitor',exact:true}) : page).getByRole('radio',{name,exact:true}).locator('..');
      await control.scrollIntoViewIfNeeded();
      const b=await control.boundingBox();
      assert.ok(b&&b.x>=0&&b.x+b.width<=width&&b.y>=0&&b.y+b.height<=844,`${name} fits at ${width}px`);
    }
    if(shots) await page.screenshot({path:path.join(shots,`room-${width}.png`)});
  }
  await page.getByRole('button',{name:'Reset room',exact:true}).click();
  assert.equal(await page.locator('.room-paint').getAttribute('data-light'),'auto');
  assert.equal(await page.getByRole('slider',{name:'Warmth'}).inputValue(),'0');
  assert.equal(await page.locator('.room-monitor-art').count(),0);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Sit down at the computer/}).click();
  assert.equal(await page.evaluate(()=>window.entered),1,'computer hit target remains aligned');
  await page.setViewportSize({width:1440,height:950});
  await page.getByRole('button',{name:'Open Practice',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.entered),2,'microphone uses the existing Practice entry');
  assert.equal(await page.getByRole('link',{name:'Open Photos',exact:true}).getAttribute('href'),'#/photos');
  for(const name of ['Daylight','Morning','Sunset','Night']) {
    await page.getByRole('button',{name:'Make it yours',exact:true}).click();
    await page.getByRole('radio',{name,exact:true}).check();
    await page.keyboard.press('Escape');
    if(shots) await page.screenshot({path:path.join(shots,`art-${name.toLowerCase()}.png`)});
  }
  const art=await page.evaluate(async()=>{
    const read=async src=>{const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);return {im,g};};
    const {im:cat,g:cg}=await read('room/cat-v2.webp');
    const pixels=cg.getImageData(0,0,cat.width,cat.height).data;let clear=0,solid=0;
    for(let i=3;i<pixels.length;i+=4){if(pixels[i]<5)clear++;if(pixels[i]>250)solid++;}
    const brightness=async src=>{const {g}=await read(src);const p=g.getImageData(80,620,700,280).data;let n=0;for(let i=0;i<p.length;i+=4)n+=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];return n/(p.length/4);};
    return {clear:clear/(pixels.length/4),solid:solid/(pixels.length/4),oldNight:await brightness('room/room-night.webp'),newNight:await brightness('room/room-night-v3.webp')};
  });
  assert.ok(art.clear>0.1&&art.solid>0.4,'cat has a real transparent cutout, not a rectangle of bedding');
  assert.ok(art.newNight>art.oldNight*1.4,'night bed and chair remain more readable than the original');
  console.log('Art checks:',art);
  const catSpot=await page.locator('.room-stage').evaluate(el=>{
    const r=el.getBoundingClientRect(),s=r.width/1672;
    return {x:r.left+245*s,y:r.top+780*s,left:r.left+80*s,right:r.left+410*s};
  });
  assert.ok(catSpot.left>=0&&catSpot.right<=1440,`whole cat fits in the desktop room: ${JSON.stringify(catSpot)} ${await page.locator('.room').evaluate(el=>JSON.stringify({scroll:el.scrollLeft,stage:el.querySelector('.room-stage').style.transform,url:location.href}))}`);
  await page.mouse.click(catSpot.x,catSpot.y);
  assert.match(await page.locator('.room-bubble').textContent(),/purr|prrrr|mrrp|happy cat/,'petting still works');
  assert.deepEqual(oldCatRequests,[],'no detached tail/ear overlays are loaded');
  for(const [width,height] of [[1024,1366],[1000,950]]) {
    await page.setViewportSize({width,height});
    await page.waitForFunction(()=>{
      const r=document.querySelector('.room-hit').getBoundingClientRect();
      return r.x>=0&&r.right<=window.innerWidth;
    });
    const target=await page.getByRole('button',{name:/Sit down at the computer/}).boundingBox();
    assert.ok(target&&target.x>=0&&target.x+target.width<=width,'cat framing never pushes the main screen off a tall display');
  }
  // Other tabs can update or clear the same browser preferences.
  const other=await page.context().newPage(); await other.goto(url);
  await other.getByRole('button',{name:'Make it yours',exact:true}).click();
  await other.getByRole('radio',{name:'Morning',exact:true}).check();
  await page.waitForFunction(()=>document.querySelector('.room-paint').dataset.light==='morning');
  await other.evaluate(()=>localStorage.removeItem('lilt.room.appearance'));
  await page.waitForFunction(()=>document.querySelector('.room-paint').dataset.light==='auto');
  await other.close();
  assert.deepEqual(api,[]); assert.deepEqual(errors,[]);
  // Exercise the real home too: its card stack and inert desk transition are absent in the fixture.
  const home=await context.newPage();
  home.on('pageerror',e=>errors.push(e.message));
  await home.route('**/api/**',r=>r.fulfill({status:503,json:{error:'Isolated room test'}}));
  await home.setViewportSize({width:1440,height:844});
  await home.goto(server.resolvedUrls.local[0]);
  assert.equal(await home.locator('.fl-radio').count(),0,'painted player replaces floating radio');
  await home.getByRole('link',{name:'Open Photos',exact:true}).click();
  await home.waitForFunction(()=>location.hash==='#/photos');
  await home.goto(`${server.resolvedUrls.local[0]}#/`);
  await home.getByRole('button',{name:'Open Practice',exact:true}).click();
  await home.waitForFunction(()=>location.hash.startsWith('#/deck'));
  await home.goto(`${server.resolvedUrls.local[0]}#/`);
  await home.setViewportSize({width:1024,height:1366});
  await home.getByRole('group',{name:'Room shortcuts'}).getByRole('link',{name:'Photos',exact:true}).click();
  await home.waitForFunction(()=>location.hash==='#/photos');
  await home.goto(`${server.resolvedUrls.local[0]}#/`);
  await home.setViewportSize({width:1440,height:844});
  await home.getByRole('button',{name:'Make it yours',exact:true}).click();
  await home.getByRole('radio',{name:'Sunset',exact:true}).check();
  const reset=home.getByRole('button',{name:'Reset room',exact:true});
  await reset.scrollIntoViewIfNeeded();
  assert.equal(await reset.evaluate(el=>{
    const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
  }),true,'home cards do not cover appearance controls');
  if(shots) await home.screenshot({path:path.join(shots,'room-home.png')});
  await home.getByRole('button',{name:/Sit down at the computer/}).focus();
  await home.keyboard.press('Enter');
  await home.waitForFunction(()=>location.hash.startsWith('#/deck'));
  await home.waitForFunction(()=>!document.querySelector('.room-appearance'));
  await home.goto(`${server.resolvedUrls.local[0]}#/`);
  await home.setViewportSize({width:390,height:844});
  await home.getByRole('group',{name:'Room shortcuts'}).getByRole('button',{name:'Music',exact:true}).click();
  await home.waitForFunction(()=>location.hash==='#/music');
  const mobilePlayer=home.locator('.music-window');
  const mobileBounds=await mobilePlayer.boundingBox();
  assert.ok(mobileBounds&&mobileBounds.x>=0&&mobileBounds.x+mobileBounds.width<=390&&mobileBounds.y+mobileBounds.height<=844,'mobile music fits');
  await mobilePlayer.getByRole('button',{name:'Close Music',exact:true}).click();
  await home.getByRole('button',{name:'Make it yours',exact:true}).click();
  await home.getByRole('button',{name:'Reset room',exact:true}).scrollIntoViewIfNeeded();
  assert.equal(await home.getByRole('button',{name:'Reset room',exact:true}).evaluate(el=>{
    const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
  }),true,'mobile home cards do not cover appearance controls');
  if(shots) await home.screenshot({path:path.join(shots,'room-home-mobile.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: original room, lighting and visible effects, warmth, decor, persistence/reset, keyboard dismissal, mobile fit, computer hit target and cross-tab updates.');
} finally {await browser?.close();await server.close();}
