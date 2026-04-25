import{API,WS_URL,$,isLoggedIn,getUser,notify,readImgB64,fmtDate}from'./lib.js';
import{homePage,offresPage,messagesPage,pretsPage,profilPage,loginPage,registerPage,associationPage,itemCard,itemDetail,loanCard}from'./pages.js';
export{showModal,hideModal}from'./lib.js';

const content=$('content');
let socket=null,activeCat='all',activeConv=null,allMessages=[];

// --- ROUTING ---
const routes={
  '/'     :()=>{guard();content.innerHTML=homePage();fetchItems();hdr();},
  '/offres':()=>{guard();content.innerHTML=offresPage();fetchItems();hdr();setCatActive();},
  '/messages':()=>{guard();content.innerHTML=messagesPage();loadMessages();hdr();},
  '/prets':()=>{guard();content.innerHTML=pretsPage();loadLoans();hdr();},
  '/profil':()=>{guard();content.innerHTML=profilPage(getUser());fetchMyItems();hdr();},
  '/login':()=>{content.innerHTML=loginPage();},
  '/register':()=>{content.innerHTML=registerPage();},
  '/association':()=>{content.innerHTML=associationPage();hdr();},
};
function guard(){if(!isLoggedIn())return navigate('/login');}
function hdr(){const u=getUser();if(u){$('userNameHeader').textContent=u.name;$('userInitial').textContent=u.name.charAt(0);}updateUnreadBadge();}

window.navigate=(p)=>{history.pushState({},'',p);handleRoute();};
const handleRoute=()=>{const p=location.pathname;const m=p.match(/^\/item\/(\d+)$/);if(m)return renderDetail(m[1]);(routes[p]||routes['/'])();scrollTo(0,0);};
window.onpopstate=handleRoute;
document.addEventListener('click',e=>{if(e.target.tagName==='A'&&e.target.getAttribute('href')?.startsWith('/')){e.preventDefault();navigate(e.target.getAttribute('href'));}});

// --- WEBSOCKET ---
function initWS(){if(!isLoggedIn())return;const u=getUser();if(socket)socket.close();
  socket=new WebSocket(`${WS_URL}/${u.id}`);
  socket.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.type==='NEW_MESSAGE'){updateUnreadBadge();if(location.pathname==='/messages')loadMessages();notify(`Nouveau message de ${m.data.sender_name}`);}
    if(m.type==='LOAN_ACCEPTED')notify('Prêt accepté !');
    if(m.type==='LOAN_REJECTED')notify('Prêt refusé.','error');
    if(m.type==='LOAN_REQUEST'){updateUnreadBadge();notify('Nouvelle demande de prêt !');}
  };
  socket.onclose=()=>setTimeout(initWS,5000);
}

// --- AUTH ---
window.doLogin=async e=>{e.preventDefault();
  const res=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value,password:$('password').value})});
  if(res.ok){localStorage.setItem('user',JSON.stringify(await res.json()));initWS();navigate('/');}
  else notify('Identifiants incorrects.','error');
};
window.doRegister=async e=>{e.preventDefault();
  const res=await fetch(`${API}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('regName').value,email:$('regEmail').value,password:$('regPassword').value})});
  if(res.ok){notify('Compte créé ! Vérifiez vos emails.');navigate('/login');}
  else notify("Erreur lors de l'inscription.",'error');
};
window.doLogout=()=>{localStorage.removeItem('user');if(socket)socket.close();navigate('/login');};
window.updateProfile=async e=>{e.preventDefault();const u=getUser();
  const res=await fetch(`${API}/users/${u.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('editName').value,email:$('editEmail').value,school:$('editSchool').value})});
  if(res.ok){localStorage.setItem('user',JSON.stringify(await res.json()));routes['/profil']();notify('Profil mis à jour !');}
};

// --- ITEMS ---
async function fetchItems(){
  const params=new URLSearchParams();
  if(activeCat&&activeCat!=='all')params.set('category',activeCat);
  const s=$('searchInput');if(s&&s.value)params.set('search',s.value);
  const items=await(await fetch(`${API}/items?${params}`)).json();
  const grid=$('offersGrid');if(!grid)return;
  const uid=getUser()?.id||0;
  grid.innerHTML=items.filter(i=>i.owner_id!==uid).map(i=>itemCard(i)).join('')||'<div class="col-span-full text-center py-8 text-gray-400 text-sm">Aucune annonce trouvée.</div>';
}
window.doSearch=()=>fetchItems();
window.filterCat=c=>{activeCat=c;fetchItems();setCatActive();};
function setCatActive(){document.querySelectorAll('.cat-pill').forEach(b=>{b.classList.toggle('active',b.dataset.cat===activeCat);});}

window.addItem=async e=>{e.preventDefault();
  let photo='';const f=$('itemPhoto').files[0];if(f)photo=await readImgB64(f);
  await fetch(`${API}/items`,{method:'POST',headers:{'Content-Type':'application/json','X-Sharer-User-Id':getUser().id},
    body:JSON.stringify({name:$('itemName').value,category:$('itemCategory').value,quality:$('itemQuality').value,description:$('itemDesc').value,photo_url:photo,available_from:$('itemFrom').value||null,available_until:$('itemUntil').value||null})
  });
  window.hideModal('modal');fetchItems();notify('Annonce publiée !');
};
window.deleteItem=async id=>{if(!confirm('Supprimer cette annonce ?'))return;
  await fetch(`${API}/items/${id}`,{method:'DELETE',headers:{'X-Sharer-User-Id':getUser().id}});fetchMyItems();notify('Annonce supprimée.');};

async function fetchMyItems(){
  const items=await(await fetch(`${API}/items`)).json();const u=getUser();const grid=$('myItemsGrid');if(!grid)return;
  const mine=items.filter(i=>i.owner_id===u.id);
  grid.innerHTML=mine.length?mine.map(i=>`
    <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 hover:border-emerald-500 transition-all cursor-pointer group" onclick="if(event.target.tagName!=='BUTTON'&&event.target.tagName!=='svg'&&event.target.tagName!=='path')navigate('/item/${i.id}')">
      <div class="w-12 h-12 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden">${i.photo_url?`<img src="${i.photo_url}" class="w-full h-full object-cover">`:''}</div>
      <div class="flex-1 min-w-0"><h4 class="font-bold text-sm truncate group-hover:text-emerald-600">${i.name}</h4><div class="text-[10px] ${i.status==='available'?'text-emerald-600':'text-orange-500'} font-black uppercase">${i.status==='available'?'En ligne':'Réservé'}</div></div>
      <button onclick="event.stopPropagation();deleteItem(${i.id})" class="p-1.5 text-gray-400 hover:text-red-600"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z"/></svg></button>
    </div>`).join(''):'<div class="col-span-full text-center py-6 text-gray-400 text-sm">Aucune annonce.</div>';
}

async function renderDetail(id){
  const i=await(await fetch(`${API}/items/${id}`)).json();
  const isOwner=i.owner_id===getUser()?.id;
  content.innerHTML=itemDetail(i,isOwner);hdr();
}

// --- MESSAGES (2-column layout) ---
async function loadMessages(){
  const u=getUser();
  const res=await fetch(`${API}/messages/${u.id}`);allMessages=await res.json();
  const groups={};
  allMessages.forEach(m=>{
    const k=m.item_id;
    if(!groups[k])groups[k]={item:m.item_name,photo:m.item_photo,msgs:[],other:m.sender_id===u.id?m.receiver_id:m.sender_id,itemId:m.item_id,unread:0};
    groups[k].msgs.push(m);
    if(!m.is_read&&m.receiver_id===u.id)groups[k].unread++;
  });
  const convList=$('convList');if(!convList)return;
  const entries=Object.values(groups);
  if(!entries.length){convList.innerHTML='<div class="p-6 text-center text-xs text-gray-400">Aucune conversation.</div>';return;}
  convList.innerHTML=entries.map(g=>`
    <div class="conv-item ${activeConv===g.itemId?'active':''}" onclick="openConv(${g.itemId},${g.other})">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">${g.photo?`<img src="${g.photo}" class="w-full h-full object-cover">`:''}</div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between"><span class="font-bold text-sm truncate">${g.item}</span>${g.unread?`<span class="bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">${g.unread}</span>`:''}</div>
          <div class="text-xs text-gray-400 truncate">${g.msgs[g.msgs.length-1].content}</div>
        </div>
      </div>
    </div>`).join('');
  if(activeConv)renderChat(activeConv,groups[activeConv]?.other);
  updateUnreadBadge();
}

window.openConv=async(itemId,other)=>{
  activeConv=itemId;
  // mark as read
  await fetch(`${API}/messages/read-all`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:itemId,user_id:getUser().id})});
  renderChat(itemId,other);
  loadMessages();// refresh sidebar
  // mobile: show chat
  document.querySelector('.conv-sidebar')?.classList.add('hidden-mobile');
  $('chatPanel')?.classList.remove('hidden-mobile');
};

window.showConvList=()=>{
  document.querySelector('.conv-sidebar')?.classList.remove('hidden-mobile');
  $('chatPanel')?.classList.add('hidden-mobile');
};

async function renderChat(itemId,other){
  const u=getUser();
  const msgs=allMessages.filter(m=>m.item_id===itemId);
  const header=$('chatHeader');const chatMsgs=$('chatMessages');const bar=$('chatInputBar');
  if(!header||!chatMsgs)return;
  const item=msgs[0]?.item_name||'';
  // Fetch item to check if current user is owner
  let isOwner=false;
  try{const itemData=await(await fetch(`${API}/items/${itemId}`)).json();isOwner=itemData.owner_id===u.id;}catch{}
  const loanBtn=isOwner?'':`<button onclick="requestLoanFromChat(${itemId},${other})" class="ml-auto bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800">Demander le prêt</button>`;
  header.innerHTML=`<button class="md:hidden text-gray-400 mr-2" onclick="showConvList()">←</button>
    <span class="font-bold text-sm">${item}</span>
    ${loanBtn}`;
  chatMsgs.innerHTML=msgs.map(m=>{
    const cls=m.sender_id===u.id?'sent':m.content.startsWith('📅')||m.content.startsWith('✅')||m.content.startsWith('❌')?'system':'received';
    const time=new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    return`<div><div class="msg-bubble ${cls}">${m.content}</div><div class="text-[10px] text-gray-300 mt-0.5 ${cls==='sent'?'text-right':cls==='system'?'text-center':''}">${time}</div></div>`;
  }).join('');
  chatMsgs.scrollTop=chatMsgs.scrollHeight;
  bar.classList.remove('hidden');
  bar.dataset.itemId=itemId;bar.dataset.other=other;
}

window.sendReply=async()=>{
  const bar=$('chatInputBar');const input=$('chatInput');
  if(!input.value.trim())return;
  const u=getUser();
  await fetch(`${API}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:parseInt(bar.dataset.itemId),sender_id:u.id,receiver_id:parseInt(bar.dataset.other),content:input.value})});
  input.value='';loadMessages();
};

window.initChat=async(itemId,ownerId)=>{
  const msg=$('chatInput')?.value;if(!msg)return;
  await fetch(`${API}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:itemId,sender_id:getUser().id,receiver_id:ownerId,content:msg})});
  notify('Message envoyé !');navigate('/messages');
};

window.requestLoan=async itemId=>{
  const u=getUser();const from=$('loanFrom')?.value;const until=$('loanUntil')?.value;
  const res=await fetch(`${API}/items/${itemId}/reserve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({borrower_id:u.id,start_date:from||null,end_date:until||null})});
  if(res.ok){notify('Demande de prêt envoyée !');navigate('/messages');}
  else{const err=await res.json().catch(()=>({}));notify(err.message||'Erreur lors de la demande.','error');}
};

window.requestLoanFromChat=async(itemId,other)=>{
  const from=prompt('Date début (JJ/MM/AAAA) — vide pour aucune date :');
  const until=prompt('Date fin (JJ/MM/AAAA) :');
  const u=getUser();
  let sd=null,ed=null;
  if(from){const p=from.split('/');sd=`${p[2]}-${p[1]}-${p[0]}`;}
  if(until){const p=until.split('/');ed=`${p[2]}-${p[1]}-${p[0]}`;}
  const res=await fetch(`${API}/items/${itemId}/reserve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({borrower_id:u.id,start_date:sd,end_date:ed})});
  if(res.ok){notify('Demande de prêt envoyée !');loadMessages();}
  else{const err=await res.json().catch(()=>({}));notify(err.message||'Erreur lors de la demande.','error');}
};

// --- LOANS ---
async function loadLoans(){
  const u=getUser();const loans=await(await fetch(`${API}/loans/user/${u.id}`)).json();
  const list=$('loansList');if(!list)return;
  list.innerHTML=loans.length?loans.map(t=>loanCard(t,u.id)).join(''):'<div class="text-center py-8 text-gray-400 text-sm">Aucun prêt ou emprunt.</div>';
}
window.handleLoan=async(id,status)=>{
  await fetch(`${API}/loans/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
  notify(status==='accepted'?'Prêt accepté !':status==='rejected'?'Prêt refusé.':'Prêt terminé.');loadLoans();
};

// --- UNREAD BADGE ---
async function updateUnreadBadge(){
  if(!isLoggedIn())return;
  try{
    const u=getUser();const res=await fetch(`${API}/messages/${u.id}`);const msgs=await res.json();
    const unread=msgs.filter(m=>!m.is_read&&m.receiver_id===u.id).length;
    const badge=$('unreadBadge');if(badge){badge.textContent=unread;badge.classList.toggle('hidden',!unread);}
  }catch{}
}

// --- INIT ---
if(isLoggedIn()){initWS();hdr();}
handleRoute();
setInterval(updateUnreadBadge,30000);
