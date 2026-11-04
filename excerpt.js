// Selection state is short-lived. Durable anchors always include language, revision and exact text.
export function mountExcerpt(api,ex,task){
 const {el,button,field,t,lang,list,uid,saveMany,save,announce,today,main}=api;
 const text=ex.text[lang],abort=new AbortController();
 let chosen=null,chosenColor=null,savingNote=false;
 const block=el('p',{class:'excerpt',tabindex:0}),menu=el('div',{class:'selection-menu',role:'toolbar','aria-label':t('Означување текст','Označavanje teksta')});
 menu.hidden=true;
 const colors=[['gold',t('Жолта','Žuta')],['green',t('Зелена','Zelena')],['pink',t('Розова','Ružičasta')],['blue',t('Светлосина','Svijetloplava')],['orange',t('Портокалова','Narančasta')]];
 const color=el('select',{'aria-label':t('Боја на подвлекување','Boja označavanja')},...colors.map(([v,l])=>el('option',{value:v},l)));
 const active=()=>list('highlight').filter(h=>!h.removed&&h.excerptId===ex.id&&h.lang===lang&&h.revision===ex.revision&&text.slice(h.start,h.end)===h.quote);
 function paint(){
  const hs=active(),boundaries=[...new Set([0,text.length,...hs.flatMap(h=>[h.start,h.end])])].sort((a,b)=>a-b);block.replaceChildren();
  for(let i=0;i<boundaries.length-1;i++){
   const start=boundaries[i],end=boundaries[i+1],h=hs.findLast(h=>h.start<=start&&h.end>=end);
   block.append(h?el('mark',{class:h.color,onclick:()=>{chosen={start,end,quote:text.slice(start,end)};chosenColor=h.color;menu.hidden=false;}},text.slice(start,end)):document.createTextNode(text.slice(start,end)));
  }
 }
 function selection(){
  const s=getSelection();if(!s?.rangeCount||s.isCollapsed)return;
  const r=s.getRangeAt(0);if(!block.contains(r.startContainer)||!block.contains(r.endContainer))return;
  const prefix=r.cloneRange();prefix.selectNodeContents(block);prefix.setEnd(r.startContainer,r.startOffset);
  const start=prefix.toString().length,end=start+r.toString().length;
  chosen={start,end,quote:text.slice(start,end)};
  chosenColor=active().findLast(h=>h.start<=start&&h.end>=end)?.color||null;menu.hidden=false;
 }
 function validChoice(){return chosen&&Number.isInteger(chosen.start)&&Number.isInteger(chosen.end)&&chosen.start>=0&&chosen.end<=text.length&&chosen.end>chosen.start;}
 async function apply(value){
  if(!validChoice()){announce(t('Избери дел од пробниот текст.','Odaberi dio probnog teksta.'));return;}
  await save({key:uid('highlight'),type:'highlight',excerptId:ex.id,lang,revision:ex.revision,...chosen,color:value});chosenColor=value;paint();
 }
 async function remove(){
  if(!validChoice())return;const changes=[];
  for(const h of active().filter(h=>h.start<chosen.end&&h.end>chosen.start)){
   changes.push({...h,removed:true});
   for(const [a,b] of [[h.start,Math.min(h.end,chosen.start)],[Math.max(h.start,chosen.end),h.end]])if(b>a)changes.push({...h,key:uid('highlight'),start:a,end:b,quote:text.slice(a,b)});
  }
  if(changes.length)await saveMany(changes);chosenColor=null;paint();menu.hidden=true;
 }
 const savedMessage=el('span',{role:'status'});
 const openNote=el('a',{},t('Отвори белешка','Otvori bilješku'));
 const savedNotice=el('p',{class:'muted'},savedMessage,' ',openNote);
 savedNotice.hidden=true;
 async function addNote(){
  if(savingNote||!validChoice())return;
  const record={key:uid('note'),type:'note',title:api.localized(task.title),text:'',url:'',runId:null,
   source:{taskId:api.taskId(task),taskTitle:api.localized(task.title),excerptId:ex.id,lang,revision:ex.revision,...chosen,savedOn:today(),color:chosenColor}};
  savingNote=true;
  try{
   await save(record);if(api.failed()||abort.signal.aborted)return;
   menu.hidden=true;getSelection()?.removeAllRanges();
   openNote.href='#note/'+record.key;savedNotice.hidden=false;
   savedMessage.textContent=t('Извадокот е зачуван во Мој нотес.','Odlomak je spremljen u Moju bilježnicu.');
   openNote.focus();
  }finally{savingNote=false;}
 }
 const row=el('div',{class:'swatches'},...colors.map(([value,label])=>el('button',{type:'button',class:'swatch '+value,'aria-label':label,title:label,onclick:()=>apply(value)})));
 menu.append(row,el('div',{class:'selection-actions'},button(t('Отстрани','Ukloni'),remove),button(t('Зачувај извадок','Spremi odlomak'),addNote),button('×',()=>{menu.hidden=true;getSelection()?.removeAllRanges();})));
 menu.lastChild.lastChild.setAttribute('aria-label',t('Затвори мени','Zatvori izbornik'));
 menu.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')e.preventDefault();});
 document.addEventListener('selectionchange',selection,{signal:abort.signal});
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target)&&!block.contains(e.target))menu.hidden=true;},{signal:abort.signal});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')menu.hidden=true;},{signal:abort.signal});
 const start=el('input',{type:'number',min:1,max:text.length,value:1,'aria-label':t('Од знак','Od znaka')}),end=el('input',{type:'number',min:1,max:text.length,value:text.length,'aria-label':t('До знак','Do znaka')});
 const choosePositions=()=>{chosen={start:Number(start.value)-1,end:Number(end.value),quote:text.slice(Number(start.value)-1,Number(end.value))};};
 main.append(el('section',{class:'card excerpt-card'},el('span',{class:'eyebrow'},t('ПРОБЕН ИЗВАДОК · НЕ Е МУРЛИ','PROBNI ODLOMAK · NIJE MURLI')),block,menu,savedNotice,
  el('details',{},el('summary',{},t('Подвлекување со тастатура / по знаци','Označavanje tipkovnicom / po znakovima')),el('div',{class:'toolbar'},field(t('Од знак (1…)','Od znaka (1…)'),start),field(t('До знак, вклучително','Do znaka, uključivo'),end),color,button(t('Примени','Primijeni'),()=>{choosePositions();apply(color.value);}),button(t('Зачувај избран извадок','Spremi odabrani odlomak'),()=>{choosePositions();chosenColor=color.value;addNote();})))));
 const old=list('highlight').filter(h=>!h.removed&&h.excerptId===ex.id&&h.lang===lang&&!active().some(v=>v.key===h.key));
 if(old.length)main.append(el('p',{class:'warning'},t('Зачувани подвлекувања од постара верзија: ','Spremljene oznake iz starije verzije: ')+old.length));
 paint();return ()=>abort.abort();
}
