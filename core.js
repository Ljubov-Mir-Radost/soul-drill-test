export const SCHEMA = 2;
export function validDate(s) { if(typeof s !== 'string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s; }
export function today(d=new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function addDays(s,n) {if(!validDate(s)||!Number.isInteger(n))throw Error('Invalid date');const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function endDate(start,days) {return days===null?null:addDays(start,days-1);}
export function remaining(end,now=today()) {return end===null?null:Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(now+'T12:00:00Z'))/86400000)+1;}
export function safeYoutube(value) {try {const u=new URL(value);return u.protocol==='https:'&&['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(u.hostname)&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}}
export function safeWebUrl(value) {
 try {if(typeof value!=='string'||value.length>2000||/[\u0000-\u001f\u007f]/.test(value)||!/^https?:\/\//i.test(value))return null;
 const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&u.hostname&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function linkType(value) {
 const safe=safeWebUrl(value);if(!safe)return 'other';const u=new URL(safe),p=u.pathname.toLowerCase();
 if(/\.pdf$/.test(p))return 'pdf';
 if(/\.(mp3|m4a|wav|ogg|flac)$/.test(p))return 'audio';
 if(/\.(mp4|webm|mov)$/.test(p)||['youtube.com','www.youtube.com','m.youtube.com','youtu.be','vimeo.com','www.vimeo.com'].includes(u.hostname))return 'video';
 if(/\.(html?|php)$/.test(p)||p.endsWith('/'))return 'web';return 'other';
}
export const highlightColors=['gold','green','pink','blue','orange','purple']; // purple remains valid for v1 records
const string=(v,n=20000)=>typeof v==='string'&&v.length<=n;
const id=v=>string(v,100)&&/^[a-zA-Z0-9:_-]+$/.test(v);
export function validateRecord(r) {
 if(!r||typeof r!=='object'||Array.isArray(r)||!id(r.key)||!['settings','note','run','personal','highlight','termnote','plan','check'].includes(r.type)||!string(r.updatedAt,40)||!Number.isFinite(Date.parse(r.updatedAt)))return false;
 if(!r.key.startsWith(r.type+':'))return false;
 const allowed={settings:['lang','theme','large','fontSize'],note:['title','text','url','runId','source'],run:['taskId','start','days','status','reflection','continuedFrom','completedAt'],personal:['title','instruction','days'],highlight:['excerptId','lang','revision','start','end','quote','color','removed'],termnote:['termId','text'],plan:['runId','effectiveFrom','times'],check:['runId','date','time','done']}[r.type];
 if(Object.keys(r).some(k=>!['key','type','updatedAt',...allowed].includes(k)))return false;
 switch(r.type){
 case 'settings':return r.key==='settings:main'&&['mk','bhs'].includes(r.lang)&&['light','dark'].includes(r.theme)&&typeof r.large==='boolean'&&(r.fontSize===undefined||[0,1,2].includes(r.fontSize));
 case 'note':return string(r.title,200)&&string(r.text)&&string(r.url,2000)&&(!r.url||!!safeWebUrl(r.url))&&(r.runId===null||id(r.runId))&&(r.source===undefined||validNoteSource(r.source));
 case 'run':return id(r.taskId)&&validDate(r.start)&&(r.days===null||(Number.isInteger(r.days)&&r.days>0&&r.days<=3650))&&['active','completed'].includes(r.status)&&string(r.reflection)&&(r.continuedFrom===undefined||id(r.continuedFrom))&&(r.completedAt===undefined||(typeof r.completedAt==='string'&&r.completedAt.length===16&&validDate(r.completedAt.slice(0,10))&&r.completedAt[10]==='T'&&validClock(r.completedAt.slice(11))));
 case 'personal':return string(r.title,200)&&r.title.trim().length>0&&string(r.instruction)&&(r.days===null||(Number.isInteger(r.days)&&r.days>0&&r.days<=3650));
 case 'highlight':return id(r.excerptId)&&['mk','bhs'].includes(r.lang)&&Number.isInteger(r.revision)&&r.revision>0&&Number.isInteger(r.start)&&r.start>=0&&Number.isInteger(r.end)&&r.end>r.start&&r.end<=20000&&string(r.quote)&&r.quote.length===r.end-r.start&&highlightColors.includes(r.color)&&(r.removed===undefined||typeof r.removed==='boolean');
 case 'termnote':return id(r.termId)&&string(r.text);
 case 'plan':return id(r.runId)&&validDate(r.effectiveFrom)&&Array.isArray(r.times)&&r.times.length>0&&r.times.length<=24&&r.times.every(validClock)&&new Set(r.times).size===r.times.length&&r.key==='plan:'+r.runId+':'+r.effectiveFrom;
 case 'check':return id(r.runId)&&validDate(r.date)&&validClock(r.time)&&typeof r.done==='boolean'&&r.key==='check:'+r.runId+':'+r.date+':'+r.time.replace(':','-');
 }return false;
}
const validClock=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
function validNoteSource(s){
 return s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).every(k=>['taskId','taskTitle','excerptId','lang','revision','start','end','quote','savedOn','color'].includes(k))&&id(s.taskId)&&string(s.taskTitle,200)&&id(s.excerptId)&&['mk','bhs'].includes(s.lang)&&Number.isInteger(s.revision)&&s.revision>0&&Number.isInteger(s.start)&&s.start>=0&&Number.isInteger(s.end)&&s.end>s.start&&s.end<=20000&&string(s.quote)&&s.quote.length===s.end-s.start&&validDate(s.savedOn)&&(s.color===null||highlightColors.includes(s.color));
}
export function parseBackup(text) {
 if(typeof text!=='string'||text.length>5_000_000)throw Error('backup-size');
 const b=JSON.parse(text);if(!b||b.app!=='avijakt-praktika'||![1,SCHEMA].includes(b.schema)||!Array.isArray(b.records)||b.records.length>10000)throw Error('backup-format');
 const keys=new Set();for(const r of b.records){if(!validateRecord(r)||keys.has(r.key))throw Error('backup-record');keys.add(r.key);}return b.records;
}
export function mergePlan(local,incoming) { const byId=new Map(local.map(r=>[r.key,r]));const added=[],conflicts=[],same=[];for(const r of incoming){const old=byId.get(r.key);if(!old)added.push(r);else if(JSON.stringify(old)===JSON.stringify(r))same.push(r);else conflicts.push(r);}return {added,conflicts,same}; }
