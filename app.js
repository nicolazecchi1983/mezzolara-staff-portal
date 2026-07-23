
let DATA={sessions:[],events:[]}; let current=new Date(2026,6,1);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
async function init(){DATA=await fetch('data.json').then(r=>r.json());bind();renderCalendar();renderLibrary()}
function bind(){
 $('#loginForm').onsubmit=e=>{e.preventDefault();$('#loginScreen').classList.add('hidden');$('#app').classList.remove('hidden')};
 $('#logoutBtn').onclick=()=>{$('#app').classList.add('hidden');$('#loginScreen').classList.remove('hidden')};
 $$('.nav').forEach(b=>b.onclick=()=>showView(b.dataset.view));
 $$('[data-view-jump]').forEach(b=>b.onclick=()=>{showView(b.dataset.viewJump);$('#dayDialog').close()});
 $('#prevMonth').onclick=()=>{current.setMonth(current.getMonth()-1);renderCalendar()};
 $('#nextMonth').onclick=()=>{current.setMonth(current.getMonth()+1);renderCalendar()};
 $('#closeDay').onclick=()=>$('#dayDialog').close(); $('#closeViewer').onclick=()=>$('#viewer').close();
 $('#searchInput').addEventListener('input',renderLibrary); $('#fieldFilter').addEventListener('input',renderLibrary)
}
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===id));$('#pageTitle').textContent={calendar:'Calendario',library:'Training Library',sheet:'Training Sheet',squad:'Rosa',analysis:'Analisi Gare',methodology:'Metodologia',settings:'Impostazioni'}[id]}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function renderCalendar(){
 const y=current.getFullYear(),m=current.getMonth(); $('#monthLabel').textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(current).toUpperCase();
 const first=new Date(y,m,1), start=new Date(y,m,1-((first.getDay()+6)%7));
 $('#calendarGrid').innerHTML='';
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=iso(d), ev=DATA.events.filter(e=>e.date===key);
  const btn=document.createElement('button');btn.className='day'+(d.getMonth()!==m?' outside':'')+(ev.some(e=>e.type==='training')?' has-training':'');btn.innerHTML=`<span class="num">${d.getDate()}</span>`+ev.slice(0,3).map(e=>`<span class="event ${e.type}">${e.time?e.time+' · ':''}${e.title}</span>`).join('');
  btn.onclick=()=>openDay(key,ev);$('#calendarGrid').appendChild(btn)}
}
function openDay(date,events){
 const d=new Date(date+'T12:00:00');$('#dayDate').textContent=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d).toUpperCase();
 $('#dayEvents').innerHTML=events.length?events.map(e=>`<div class="event-detail"><strong>${e.title}</strong><span>${e.time||'Intera giornata'} · ${label(e.type)}</span>${e.sheet?`<button class="secondary" onclick="openViewer('${e.sheet}')">Apri ${e.sheet}</button>`:''}</div>`).join(''):'<div class="event-detail"><strong>Nessun impegno</strong><span>Non risulta alcun allenamento o evento ufficiale.</span></div>';
 $('#dayDialog').showModal()
}
function label(t){return{training:'Allenamento',match:'Partita',meeting:'Riunione',rest:'Riposo'}[t]}
function renderLibrary(){
 const q=$('#searchInput').value.toLowerCase(),f=$('#fieldFilter').value;
 const arr=DATA.sessions.filter(s=>(!q||[s.id,s.title,...s.tags].join(' ').toLowerCase().includes(q))&&(!f||s.field===f)).reverse();
 $('#sessionGrid').innerHTML=arr.map(s=>`<article class="card"><img src="${s.image}" alt="${s.id}"><div class="card-body"><span class="badge">${s.id}</span><h3>${s.title}</h3><p>${formatDate(s.date)} · ${s.slot} · ${s.field}</p><div class="tags">${s.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div><button class="primary" onclick="openViewer('${s.id}')">Apri Training Sheet</button></div></article>`).join('')
}
function formatDate(x){return new Intl.DateTimeFormat('it-IT').format(new Date(x+'T12:00:00'))}
function openViewer(id){
 const s=DATA.sessions.find(x=>x.id===id); if(!s)return;$('#viewerMeta').textContent=`${s.id} · ${formatDate(s.date)} · ${s.slot} · ${s.field}`;$('#viewerTitle').textContent=s.title;$('#viewerImage').src=s.image;$('#viewerTags').innerHTML=s.tags.map(t=>`<span class="tag">${t}</span>`).join(' ');$('#downloadBtn').href=s.image;$('#viewer').showModal()
}
window.openViewer=openViewer;init();
