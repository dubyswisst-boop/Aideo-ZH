import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root=process.cwd();
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/App.css'),'utf8');
for(const [name,ok] of [
 ['real App pointer handler',app.includes('onPointerMove={handlePlayerBarPointerMove}')],
 ['view-scoped class',app.includes('nowplaying-playerbar-autohide')],
 ['bottom threshold',app.includes('distanceFromBottom <= 12')],
 ['auto-hide styling',css.includes('/* V10 NOWPLAYING PLAYERBAR AUTOHIDE')],
 ['no-reflow style',css.includes('.app.nowplaying-playerbar-autohide .nowplaying')],
]){if(!ok)throw Error('FAIL source contract: '+name);console.log('PASS source '+name)}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const file='file://'+resolve(root,'tools/playerbar-preview/fixture.html');
 await page.goto(file); await page.waitForTimeout(250);
 for(const d of ['classic','floating','waveform','minimal','vinyl']){
   await page.evaluate(d=>window.setDesign(d),d);
   await page.mouse.move(500,200);await page.waitForTimeout(270);
   let a=await page.evaluate(()=>window.snapshot());
   const initialTop=a.main.top, initialHeight=a.main.height;
   if(a.revealed)throw Error(d+': initially revealed');
   await page.mouse.move(500,795);await page.waitForTimeout(250);
   let b=await page.evaluate(()=>window.snapshot());
   if(!b.revealed)throw Error(d+': bottom edge did not reveal');
   if(Math.abs(b.bar.bottom-800)>2)throw Error(d+': revealed bar not on bottom '+b.bar.bottom);
   await page.mouse.move(500,790); await page.waitForTimeout(100);
   let c=await page.evaluate(()=>window.snapshot());
   if(!c.revealed)throw Error(d+': bar flickers on hover');
   await page.mouse.move(500,60);await page.waitForTimeout(250);
   let e=await page.evaluate(()=>window.snapshot());
   if(e.revealed)throw Error(d+': did not hide after leaving bar zone');
   if(Math.abs(e.main.top-initialTop)>0.5 || Math.abs(e.main.height-initialHeight)>0.5)throw Error(d+': main content reflow');
   console.log('PASS '+d+': edge reveal, retained hover, hide, no reflow');
 }
}finally{await browser.close()}
