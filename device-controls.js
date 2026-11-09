// Capture the browser event early, before asynchronous database/content loading.
// Each event may be used once. No installation state is written to personal storage.
export function createInstallControl(t){
 const button=document.querySelector('#install-app'),status=document.querySelector('#install-status'),help=document.querySelector('#install-help'),title=document.querySelector('#device-title');
 const display=window.matchMedia('(display-mode: standalone)');
 let deferred=null,installed=false,busy=false,failed=false;
 const standalone=()=>display.matches||navigator.standalone===true;
 function render(){
  const done=installed||standalone();
  title.textContent=t('Апликација','Aplikacija');
  button.textContent=t('Инсталирај','Instaliraj');
  button.hidden=done||!deferred;button.disabled=busy;
  help.hidden=done||!!deferred;
  help.querySelector('summary').textContent=t('Како да ја инсталирам?','Kako instalirati?');
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  help.querySelector('p').textContent=ios
   ?t('Во Safari: Сподели → Додај на почетен екран → Додај. Ако има „Отвори како веб-апликација“, вклучи го.','U Safariju: Podijeli → Dodaj na početni zaslon → Dodaj. Ako postoji „Otvori kao web-aplikaciju“, uključi je.')
   :t('Во менито на прелистувачот побарај „Инсталирај апликација“ или „Додај на почетен екран“. Називот зависи од прелистувачот. Ако опцијата ја нема, отвори го линкот во целосен прелистувач, надвор од друга апликација.','U izborniku preglednika potraži „Instaliraj aplikaciju“ ili „Dodaj na početni zaslon“. Naziv ovisi o pregledniku. Ako opcije nema, otvori poveznicu u punom pregledniku, izvan druge aplikacije.');
  status.textContent=done?t('Апликацијата е инсталирана.','Aplikacija je instalirana.'):failed?t('Поканата не се отвори. Користи го менито на прелистувачот.','Poziv se nije otvorio. Koristi izbornik preglednika.'):'';
 }
 window.addEventListener('beforeinstallprompt',event=>{
  if(typeof event.prompt!=='function'||standalone())return;
  event.preventDefault();deferred=event;failed=false;render();
 });
 window.addEventListener('appinstalled',()=>{installed=true;deferred=null;render();});
 display.addEventListener('change',render);
 button.addEventListener('click',async()=>{
  if(!deferred||busy||standalone())return;
  const event=deferred;deferred=null;busy=true;failed=false;render();
  try{await event.prompt();await event.userChoice;}catch{failed=true;}
  finally{busy=false;render();}
 });
 render();return {render};
}

// Keep update feedback separate from autosave feedback. Never force a reload.
export function createUpdateControl(t){
 let registration=null,state='idle';
 const control=document.querySelector('#update-check'),message=document.querySelector('#update-status');
 const messages=()=>({
  idle:'',checking:t('Проверувам…','Provjeravam…'),
  current:t('Ја имаш најновата верзија.','Imaš najnoviju verziju.'),
  available:t('Нова верзија е подготвена. Кога ќе завршиш, затвори ги сите прозорци на Soul Drill и отвори повторно.','Nova verzija je spremna. Kad završiš, zatvori sve prozore Soul Drilla i otvori ponovo.'),
  offline:t('Нема врска. Обиди се повторно кога ќе бидеш онлајн.','Nema veze. Pokušaj ponovo kada budeš online.'),
  unavailable:t('Проверката не е достапна во овој прелистувач.','Provjera nije dostupna u ovom pregledniku.'),
  error:t('Проверката не успеа. Провери ја врската и обиди се повторно.','Provjera nije uspjela. Provjeri vezu i pokušaj ponovo.')
 });
 function render(){
  if(!control)return;
  const label=state==='available'?t('Нова верзија','Nova verzija'):t('Ажурирање','Ažuriranje');
  control.querySelector('.update-label').textContent=label;
  control.querySelector('.update-dot').hidden=state!=='available';
  control.setAttribute('aria-label',state==='available'?label:t('Провери ажурирање','Provjeri ažuriranje'));
  control.title=control.getAttribute('aria-label');
  control.disabled=state==='checking';control.setAttribute('aria-busy',String(state==='checking'));
  control.dataset.state=state;message.textContent=messages()[state];
 }
 function set(next){state=next;render();}
 function watch(reg){
  registration=reg;
  const observe=()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)set('available');});};
  reg.addEventListener('updatefound',observe);observe();if(reg.waiting)set('available');
 }
 function finishInstall(worker){
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>finish(new Error('install timeout')),20000);
   function finish(err){clearTimeout(timer);worker.removeEventListener('statechange',change);err?reject(err):resolve();}
   function change(){if(['installed','activated'].includes(worker.state))finish();else if(worker.state==='redundant')finish(new Error('install failed'));}
   worker.addEventListener('statechange',change);change();
  });
 }
 async function check(){
  if(state==='checking')return;
  if(registration?.waiting){set('available');return;}
  if(!('serviceWorker' in navigator)){set('unavailable');return;}
  if(!navigator.onLine){set('offline');return;}
  set('checking');
  try{
   if(!registration){const existing=await navigator.serviceWorker.getRegistration();watch(existing||await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));}
   await registration.update();
   if(registration.installing)await finishInstall(registration.installing);
   set(registration.waiting?'available':'current');
  }catch{set('error');}
 }
 control?.addEventListener('click',check);
 return {render,async init(){
  if(!('serviceWorker' in navigator))return;
  try{watch(await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));}catch{set(navigator.onLine?'error':'offline');}
 }};
}

export function storageProtection({el,button,t}){
 const status=el('p',{class:'muted',role:'status'}),storage=navigator.storage;
 const action=button(t('Заштити го локалното чување','Zaštiti lokalnu pohranu'),async()=>{
  action.disabled=true;
  try{const granted=await storage.persist();show(granted);}
  catch{status.textContent=t('Барањето не успеа. Обиди се повторно или преземи резервна копија.','Zahtjev nije uspio. Pokušaj ponovo ili preuzmi sigurnosnu kopiju.');action.disabled=false;}
 });
 action.id='storage-protect';status.id='storage-status';
 function show(granted){action.disabled=granted;status.textContent=granted?t('Заштитата од автоматско отстранување е вклучена. Сепак чувај резервна копија.','Zaštita od automatskog uklanjanja je uključena. I dalje čuvaj sigurnosnu kopiju.'):t('Заштитата не е одобрена. Податоците и понатаму се зачувуваат; прави резервни копии.','Zaštita nije odobrena. Podaci se i dalje spremaju; pravi sigurnosne kopije.');}
 if(typeof storage?.persist!=='function'){action.disabled=true;status.textContent=t('Овој прелистувач не ја поддржува дополнителната заштита. Користи резервни копии.','Ovaj preglednik ne podržava dodatnu zaštitu. Koristi sigurnosne kopije.');}
 else if(typeof storage.persisted==='function')storage.persisted().then(granted=>{if(granted)show(true);}).catch(()=>{});
 return el('details',{class:'card storage-protection'},el('summary',{},t('Дополнителна заштита на овој уред','Dodatna zaštita na ovom uređaju')),
  el('p',{},t('Бара од прелистувачот да не ги отстрани автоматски твоите податоци кога недостига простор. Не е резервна копија и не штити од рачно бришење, губење или расипување на уредот.','Traži od preglednika da ne uklanja automatski tvoje podatke kada nedostaje prostora. Nije sigurnosna kopija i ne štiti od ručnog brisanja, gubitka ili kvara uređaja.')),action,status);
}
