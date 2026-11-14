import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {manifest,pub,root} from './review-kit.mjs';
await import('./worker-validator.mjs');
const {validateCatalog,upgradeCatalog,canonical,applyPublication,fingerprint}=await import(new URL('../'+(pub===root?'':'public/')+'content-validator.js',import.meta.url));
const current=JSON.parse(await readFile(path.join(pub,'data/content.v2.json'),'utf8'));
const errors=validateCatalog(current);if(errors.length)throw Error(JSON.stringify(errors));
const base=process.env.BASE_SHA;
const prefix=pub===root?'':'public/';
function oldFile(name){try{return execFileSync('git',['show',base+':'+name],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch{return null;}}
if(base&&base!=='0'.repeat(40)){
 if(!/^[a-f0-9]{40}$/.test(base))throw Error('Invalid base SHA');
 const oldV1=oldFile(prefix+'data/content.v1.json');if(oldV1&&canonical(JSON.parse(oldV1))!==canonical(JSON.parse(await readFile(path.join(pub,'data/content.v1.json'),'utf8'))))throw Error('Legacy v1 catalog must stay unchanged');
 const initial=oldFile(prefix+'data/content.v2.json')||oldV1;if(!initial)throw Error('No base catalog');
 let expected=upgradeCatalog(JSON.parse(initial));
 const files=await readdir(path.join(root,'reviews')).catch(()=>[]);const pending=[];
 for(const file of files){if(file==='README.md')continue;if(!/^[a-zA-Z0-9_-]+\.publication\.json$/.test(file))throw Error('Only public publication reports belong in reviews/');const text=await readFile(path.join(root,'reviews',file),'utf8'),previous=oldFile('reviews/'+file);if(previous!==null){if(previous!==text)throw Error('Published reports are immutable');}else pending.push(JSON.parse(text));}
 const oldReviewFiles=execFileSync('git',['ls-tree','-r','--name-only',base,'--','reviews'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 for(const f of oldReviewFiles)if(f!=='reviews/README.md'&&!files.includes(path.basename(f)))throw Error('Published reports must not be deleted');
 while(pending.length){const hash=await fingerprint(expected),i=pending.findIndex(p=>p.baseCatalogHash===hash);if(i<0)throw Error('Publication was prepared against an old catalog');expected=await applyPublication(expected,pending.splice(i,1)[0],manifest.digest);}
 if(canonical(expected)!==canonical(current))throw Error('Catalog differs from approved publication reports; existing records must not be overwritten');
 const kitFiles=execFileSync('git',['ls-tree','-r','--name-only',base,'--',prefix+'review-kit/1.0.0'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 for(const f of kitFiles)if(oldFile(f)!==await readFile(path.join(root,f),'utf8'))throw Error('Versioned review kit is immutable');
}
console.log('PASS public catalog, shared validator adapter, review rules'+(base?' and publication diff':' (no base comparison requested)'));
