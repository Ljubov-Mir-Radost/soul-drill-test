import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pub,root} from './review-kit.mjs';
await import('./content-check.mjs');
const out=path.join(root,'_site');await mkdir(out,{recursive:true});
// Explicit public allowlist: no drafts, test profiles, original materials or private backups.
const files=['index.html','app.js','core.js','db.js','device-controls.js','excerpt.js','planning-ui.js','schedule.js','styles.css','sw.js','content-validator.js','content-validator-worker.js','manifest.webmanifest','data','icons','editor','review-kit'];
for(const file of files)await cp(path.join(pub,file),path.join(out,file),{recursive:true});
await writeFile(path.join(out,'.nojekyll'),'');
const stamp=process.env.GITHUB_SHA||'local-1-3-0';if(!/^[a-zA-Z0-9_-]+$/.test(stamp))throw Error('Invalid release stamp');
const sw=await readFile(path.join(out,'sw.js'),'utf8');await writeFile(path.join(out,'sw.js'),sw.replace(/const VERSION='[^']+';/,"const VERSION='soul-drill-test-static-"+stamp+"';").replaceAll('avijakt-static-','soul-drill-test-static-'));
const db=await readFile(path.join(out,'db.js'),'utf8');await writeFile(path.join(out,'db.js'),db.replace("indexedDB.open('avijakt-praktika',1)","indexedDB.open('soul-drill-test',1)"));
const html=await readFile(path.join(out,'index.html'),'utf8');await writeFile(path.join(out,'index.html'),html.replace('<title>Soul Drill</title>','<title>Soul Drill TEST</title>').replace('v1.3.0 · DEMO','v1.3.0 · TEST / DEMO'));
const manifest=JSON.parse(await readFile(path.join(out,'manifest.webmanifest'),'utf8'));manifest.name='Soul Drill TEST';manifest.short_name='Soul Drill';await writeFile(path.join(out,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
console.log('PASS Pages artifact: '+out+'; TEST database retained; cache '+stamp);
