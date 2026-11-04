import {today,addDays,endDate} from './core.js';
import {daysBetween,localMoment,planKey,checkKey,versions,slotsForDay,reportCounts} from './schedule.js';

function timeFields(api,initial=['07:00']){
 const {el,field,t}=api,box=el('div',{class:'time-fields'});
 const count=el('input',{type:'number',min:1,max:24,step:1,value:initial.length});
 function fill(times){box.replaceChildren(...times.map((time,i)=>field(t('Термин ','Termin ')+(i+1),el('input',{type:'time',required:true,value:time}))));}
 fill(initial);
 count.addEventListener('change',()=>{const n=Number(count.value);if(!Number.isInteger(n)||n<1||n>24)return;fill(Array.from({length:n},(_,i)=>{const minutes=n===1?420:Math.round(420+i*840/(n-1));return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}));});
 return {node:el('div',{},field(t('Колку пати дневно','Koliko puta dnevno'),count),box),times:()=>{const values=[...box.querySelectorAll('input')].map(i=>i.value).sort();if(values.length!==Number(count.value)||new Set(values).size!==values.length)throw Error(t('Внеси различни часови за секој термин.','Unesi različita vremena za svaki termin.'));return values;}};
}
export function periodForm(api,task,previous=[]){
 const {el,field,t,button,uid,taskId,saveMany,failed,render}=api;
 const start=el('input',{type:'date',required:true,value:today(),min:'1900-01-01',max:'9990-12-31'});
 const finish=el('input',{type:'date',required:true,value:endDate(today(),task.days||7),min:today()});
 const continuous=el('input',{type:'checkbox',checked:task.days===null});
 finish.disabled=continuous.checked;continuous.addEventListener('change',()=>finish.disabled=continuous.checked);
 start.addEventListener('change',()=>{finish.min=start.value;if(start.value)finish.value=endDate(start.value,task.days||7);});
 const times=timeFields(api),message=el('p',{role:'alert',class:'warning'});
 const form=el('form',{class:'card form period-form',onsubmit:async e=>{
  e.preventDefault();message.textContent='';
  try{const days=continuous.checked?null:daysBetween(start.value,finish.value)+1;if(days!==null&&(days<1||days>3650))throw Error(t('Периодот мора да биде од 1 до 3650 дена.','Razdoblje mora biti od 1 do 3650 dana.'));
   const run={key:uid('run'),type:'run',taskId:taskId(task),start:start.value,days,status:'active',reflection:''};
   if(previous.length)run.continuedFrom=previous[0].key;
   const plan={key:planKey(run.key,start.value),type:'plan',runId:run.key,effectiveFrom:start.value,times:times.times()};
   await saveMany([run,plan]);if(!failed())render();
  }catch(e){message.textContent=e.message;}
 }},el('h2',{},previous.length?t('Нов личен период','Novo osobno razdoblje'):t('Мој план','Moj plan')),
 field(t('Мој почетен датум','Moj početni datum'),start),field(t('Краен датум (вклучително)','Završni datum (uključivo)'),finish),field(t('Континуирана, без крај','Kontinuirana, bez kraja'),continuous),times.node,
 el('p',{class:'muted'},t('Часовите се личен план, без автоматски аларми. Старите периоди и изворната задача остануваат зачувани.','Vremena su osobni plan, bez automatskih alarma. Stara razdoblja i izvorni zadatak ostaju spremljeni.')),message,
 el('button',{type:'submit',class:'primary'},previous.length?t('Започни повторно','Započni ponovo'):t('Започни практика','Započni praksu')));
 return form;
}
export function planPanel(api,run){
 const {el,field,t,button,list,save,failed,render,date,byKey}=api;
 const ps=versions(list('plan'),run.key),latest=ps.at(-1),tomorrow=addDays(today(),1),end=endDate(run.start,run.days);
 const container=el('section',{class:'plan-panel'},el('h3',{},t('Мој план','Moj plan')));
 if(latest){container.append(el('p',{},latest.times.join(' · ')+' — '+t('важи од ','vrijedi od ')+date(latest.effectiveFrom)));}
 const editable=run.status==='active'&&(!end||end>=tomorrow||!latest);
 if(editable){
  const times=timeFields(api,latest?.times||['07:00']);
  const effective=el('input',{type:'date',required:true,value:latest?(tomorrow>run.start?tomorrow:run.start):run.start,min:latest?(tomorrow>run.start?tomorrow:run.start):run.start,...(end?{max:end}:{})});
  if(latest)effective.readOnly=true;
  const msg=el('p',{role:'alert',class:'warning'});
  const editor=el('details',{class:'plan-editor'},el('summary',{},latest?t('Измени го идниот распоред','Izmijeni budući raspored'):t('Додај дневен распоред','Dodaj dnevni raspored')),
   el('form',{class:'form',onsubmit:async e=>{e.preventDefault();msg.textContent='';try{
    await save({key:planKey(run.key,effective.value),type:'plan',runId:run.key,effectiveFrom:effective.value,times:times.times()});if(!failed())render();
   }catch(e){msg.textContent=e.message;}}},field(t('Важи од','Vrijedi od'),effective),times.node,
   el('p',{class:'muted'},latest?t('Промената важи од следниот ден (или почетокот, ако е подоцна). Денешниот и старите распореди не се менуваат.','Promjena vrijedi od sljedećeg dana (ili početka, ako je kasnije). Današnji i stari rasporedi ostaju isti.'):t('Избери од кој датум да важи првиот план. Минатите неозначени термини се бројат како неизвршени.','Odaberi od kojeg datuma vrijedi prvi plan. Prošli neoznačeni termini računaju se kao neizvršeni.')),msg,
   el('button',{type:'submit',class:'primary'},t('Зачувај план','Spremi plan'))));container.append(editor);
 }
 if(ps.length){
  container.append(el('details',{},el('summary',{},t('Историја на планови','Povijest planova')),el('ul',{},...ps.map(p=>el('li',{},date(p.effectiveFrom)+' → '+p.times.join(' · '))))));
  const last=[today(),end||today(),run.completedAt?.slice(0,10)||today()].sort()[0];
  if(run.start>last){container.append(el('p',{class:'muted'},t('Евиденцијата ќе биде достапна од почетниот ден.','Evidencija će biti dostupna od početnog dana.')));return container;}
  const day=el('input',{type:'date',value:last,min:run.start,max:last,required:true});
  const slots=el('div',{class:'drill-slots'});
  function fill(){
   slots.replaceChildren();const values=slotsForDay(run,list('plan'),day.value);
   if(!values.length){slots.append(el('p',{class:'muted'},t('Нема планирани термини за овој ден.','Nema planiranih termina za ovaj dan.')));return;}
   for(const time of values){
    const key=checkKey(run.key,day.value,time),future=day.value+'T'+time>localMoment();
    const input=el('input',{type:'checkbox',checked:!!byKey(key)?.done,'aria-label':time});input.disabled=future;
    const label=el('span',{},time+' — '+(future?t('Претстои','Predstoji'):input.checked?t('Направено','Urađeno'):t('Не е означено','Nije označeno')));
    const recordDate=day.value;
    input.addEventListener('change',async()=>{const done=input.checked;await save({key,type:'check',runId:run.key,date:recordDate,time,done});label.textContent=time+' — '+(done?t('Направено','Urađeno'):t('Не е означено','Nije označeno'));});
    slots.append(el('label',{class:'drill-slot'},input,label));
   }
  }
  day.addEventListener('change',()=>{if(day.checkValidity())fill();});
  container.append(field(t('Евиденција за ден','Evidencija za dan'),day),slots,button(t('Освежи термини','Osvježi termine'),fill),el('p',{class:'muted small'},t('Можеш да исправиш минат ден. По пристигнување на следниот час избери „Освежи термини“. Нема известувања.','Možeš ispraviti prošli dan. Kad dođe sljedeći termin, odaberi „Osvježi termine“. Nema obavijesti.')));fill();
 }
 return container;
}
export function reportScreen(api){
 const {el,button,t,list,heading,main,link,localized,tasks,taskId}=api;
 heading(t('Извештај','Izvještaj'),t('Лична евиденција на практикување, не оцена на духовниот напредок.','Osobna evidencija prakticiranja, ne ocjena duhovnog napretka.'),link(t('← Практики','← Prakse'),'#practices'));
 let period='day';const tabs=el('div',{class:'report-tabs'}),result=el('div');
 const options=[['day',t('Ден','Dan')],['week',t('Недела','Sedmica')],['month',t('Месец','Mjesec')],['total',t('Вкупно','Ukupno')]];
 function fill(){
  tabs.replaceChildren(...options.map(([value,label])=>el('button',{type:'button','aria-pressed':String(period===value),onclick:()=>{period=value;fill();}},label)));
  const runs=list('run'),plans=list('plan'),checks=list('check'),total=reportCounts(runs,plans,checks,period);
  result.replaceChildren(el('section',{class:'card report-total'},el('span',{class:'eyebrow'},t('ИЗВРШЕНИ / ПЛАНИРАНИ','IZVRŠENI / PLANIRANI')),el('strong',{'data-testid':'report-total'},`${total.done}/${total.planned}`),el('progress',{max:Math.max(total.planned,1),value:total.done,'aria-label':t('Извршени од планираните','Izvršeni od planiranih')})));
  for(const task of tasks()){
   const own=runs.filter(r=>r.taskId===taskId(task));if(!own.some(r=>plans.some(p=>p.runId===r.key)))continue;
   const c=reportCounts(own,plans,checks,period);result.append(el('div',{class:'card report-row'},link(localized(task.title),'#practice/'+encodeURIComponent(taskId(task))),el('strong',{},`${c.done}/${c.planned}`)));
  }
 }
 main.append(tabs,el('p',{class:'muted'},t('Неделата започнува во понеделник. Се бројат само термините до тековниот локален час; идните не се пропуштени.','Sedmica počinje u ponedjeljak. Broje se samo termini do trenutnog lokalnog vremena; budući nisu propušteni.')),result,button(t('Освежи извештај','Osvježi izvještaj'),fill));fill();
}
