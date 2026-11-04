import {today,addDays,endDate} from './core.js';

export const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const daysBetween=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
export function localMoment(now=new Date()){return today(now)+'T'+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');}
export const planKey=(runId,date)=>'plan:'+runId+':'+date;
export const checkKey=(runId,date,time)=>'check:'+runId+':'+date+':'+time.replace(':','-');
export function versions(plans,runId){return plans.filter(p=>p.runId===runId).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));}
export function planAt(plans,runId,date){return versions(plans,runId).findLast(p=>p.effectiveFrom<=date);}
export function runCutoff(run,now=localMoment()){
 const end=endDate(run.start,run.days);let cutoff=now;
 if(end&&end+'T23:59'<cutoff)cutoff=end+'T23:59';
 if(run.completedAt&&run.completedAt<cutoff)cutoff=run.completedAt;
 return cutoff;
}
export function slotsForDay(run,plans,date){
 const end=endDate(run.start,run.days);
 if(date<run.start||(end&&date>end))return [];
 return (planAt(plans,run.key,date)?.times||[]).filter(time=>!run.completedAt||date+'T'+time<=run.completedAt);
}
export function periodStart(period,now=today()){
 if(period==='day')return now;
 if(period==='week'){const day=new Date(now+'T12:00:00Z').getUTCDay();return addDays(now,-((day+6)%7));}
 if(period==='month')return now.slice(0,7)+'-01';
 return '0000-01-01';
}
// Count each immutable plan segment arithmetically; no growing list of future slots is stored.
export function reportCounts(runs,plans,checks,period='day',now=localMoment()){
 const from=periodStart(period,now.slice(0,10));let planned=0;const eligible=new Map();
 for(const run of runs){
  const cutoff=runCutoff(run,now),last=cutoff.slice(0,10),ps=versions(plans,run.key);
  eligible.set(run.key,{run,cutoff});
  for(let i=0;i<ps.length;i++){
   const start=[from,run.start,ps[i].effectiveFrom].sort().at(-1);
   const next=ps[i+1]?addDays(ps[i+1].effectiveFrom,-1):last;
   const end=next<last?next:last;if(start>end)continue;
   planned+=(daysBetween(start,end)+1)*ps[i].times.length;
   if(end===last)planned-=ps[i].times.filter(t=>t>cutoff.slice(11)).length;
  }
 }
 const done=new Set();
 for(const c of checks){
  const entry=eligible.get(c.runId);
  if(!c.done||!entry||c.date<from||c.date+'T'+c.time>entry.cutoff)continue;
  if(slotsForDay(entry.run,plans,c.date).includes(c.time))done.add(checkKey(c.runId,c.date,c.time));
 }
 return {done:done.size,planned};
}
