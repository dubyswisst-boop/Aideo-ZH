import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const out = resolve(root, 'tools/ui-preview/output');
await mkdir(out, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = createServer(async (req,res) => {
  const path = req.url?.split('?')[0];
  const file = path === '/' ? 'tools/ui-preview/fixture.html' : path === '/src/App.css' ? 'src/App.css' : null;
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  try {const body=await readFile(resolve(root,file));res.writeHead(200,{'Content-Type':mime[file.endsWith('.css')?'.css':'.html'],'Cache-Control':'no-store'});res.end(body);} catch (e) {res.writeHead(500);res.end(String(e));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
const report={kind:'CSS geometry fixture, NOT native Aideo / full React runtime',checks:[],source:'src/App.css'};
const check=(name,condition,detail)=>{report.checks.push({name,pass:!!condition,detail}); console.log(`${condition?'PASS':'FAIL'} ${name}: ${JSON.stringify(detail)}`);};
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForTimeout(350);
  const get=()=>page.evaluate(()=>{
    const r=(s)=>{let e=document.querySelector(s),b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity,z:getComputedStyle(e).zIndex}};
    const label=document.querySelector('.nav-item span');const b=label.getBoundingClientRect();const cs=getComputedStyle(label);
    return {sidebar:r('.app-sidebar'),main:r('.app-main'),player:r('.player-bar'),label:{w:b.width,h:b.height,whiteSpace:cs.whiteSpace,display:cs.display},appWidth:document.documentElement.clientWidth};
  });
  const before=await get();
  check('Initial sidebar hidden',before.sidebar.visibility==='hidden'||Number(before.sidebar.opacity)<0.1,before.sidebar);
  await page.screenshot({path:resolve(out,'01-hidden.png'),fullPage:true});
  await page.evaluate(()=>window.fixtureSetState(true,false));
  await page.waitForTimeout(400);
  const rail=await get();
  check('Icon rail width 44–58 px',rail.sidebar.w>=44&&rail.sidebar.w<=58,rail.sidebar);
  await page.screenshot({path:resolve(out,'02-icon-rail.png'),fullPage:true});
  await page.evaluate(()=>window.fixtureSetState(true,true));
  await page.waitForTimeout(400);
  const full=await get();
  check('Expanded overlay width 220–300 px',full.sidebar.w>=220&&full.sidebar.w<=300,full.sidebar);
  check('Full-height overlay includes player bar',Math.abs(full.sidebar.y)<3&&full.sidebar.bottom>=full.player.bottom-3,{sidebar:full.sidebar,player:full.player});
  check('Expanded label stays single line',full.label.w>38&&full.label.whiteSpace==='nowrap',full.label);
  check('Main content does not reflow',Math.abs(before.main.x-full.main.x)<3&&Math.abs(before.main.w-full.main.w)<3,{before:before.main,after:full.main});
  check('Sidebar overlays player bar',Number(full.sidebar.z)>Number(full.player.z||0),{sidebarZ:full.sidebar.z,playerZ:full.player.z});
  await page.screenshot({path:resolve(out,'03-expanded-overlay.png'),fullPage:true});
  // Clicking the real arrow must keep state 1 (rail) visible until the pointer leaves.
  await page.locator('.sidebar-toggle-btn').click();await page.waitForTimeout(400);
  const collapsed=await get();
  const collapsedClasses=await page.locator('#app').getAttribute('class');
  check('Arrow collapses to visible icon rail',
    collapsed.sidebar.w>=44&&collapsed.sidebar.w<=58&&
    collapsed.sidebar.x>=-1&&collapsed.sidebar.visibility==='visible'&&
    Number(collapsed.sidebar.opacity)>0.9&&
    collapsedClasses.includes('sidebar-auto-visible')&&
    !collapsedClasses.includes('sidebar-auto-expanded'),
    {sidebar:collapsed.sidebar,classes:collapsedClasses});
  await page.screenshot({path:resolve(out,'04-after-arrow-collapse.png'),fullPage:true});
  // An actual pointer move (not CSS-only width) is what should end the collapse guard.
  // Move into the rail first, then physically leave it.
  await page.mouse.move(25,180);
  await page.waitForTimeout(100);
  await page.mouse.move(400,180);
  await page.waitForTimeout(400);
  const hidden=await get();
  const hiddenClasses=await page.locator('#app').getAttribute('class');
  check('Real mouse leave hides sidebar',
    (hidden.sidebar.visibility==='hidden'||Number(hidden.sidebar.opacity)<0.1)&&
    !hiddenClasses.includes('sidebar-auto-visible'),
    {sidebar:hidden.sidebar,classes:hiddenClasses});
  await page.screenshot({path:resolve(out,'05-after-mouse-leave.png'),fullPage:true});
} catch(e){check('Browser test infrastructure',false,String(e?.stack||e));}
finally { await writeFile(resolve(out,'results.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r)); }
if(report.checks.some(c=>!c.pass))process.exitCode=1;
