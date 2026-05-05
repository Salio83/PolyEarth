import{API,WS_URL,$,isLoggedIn,getUser,notify,readImgB64,fmtDate,catIcon,catBadge,qBadge,stars,dispoBadge,showModal as sm, hideModal as hm}from'./lib.js';
import{homePage,offresPage,demandesPage,messagesPage,pretsPage,profilPage,userProfilePage,loginPage,registerPage,associationPage,itemCard,itemDetail,loanRow}from'./pages.js';

// --- GLOBALS ---
window.$ = $;
window.showModal = sm;
window.hideModal = hm;

const content=$('content');
let socket=null,activeCat='all',allMessages=[];
let activeConv=localStorage.getItem('activeConv') || null;

// --- RATINGS ---
let currentRating = 0;
let currentTransactionId = null;
let currentRevieweeId = null;
let currentItemId = null;
let currentReLendChoice = false;

window.setRating = (n) => {
  currentRating = n;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    if (i < n) btn.classList.remove('grayscale');
    else btn.classList.add('grayscale');
  });
};

window.submitReview = async () => {
  if (currentRating === 0) return notify('Veuillez sélectionner une note', 'error');
  
  const u = getUser();
  const comment = $('reviewComment').value;
  
  try {
    await fetch(`${API}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_id: currentTransactionId,
        reviewer_id: u.id,
        reviewee_id: currentRevieweeId,
        rating: currentRating,
        comment
      })
    });
    
    hideModal('reviewModal');
    notify('Merci pour votre avis !');
    
    // If owner chose to re-lend
    if (!$('reLendOption').classList.contains('hidden')) {
       await reLendItem(currentItemId, currentReLendChoice);
    }
    
    // Refresh
    handleRoute();
  } catch (e) {
    console.error(e);
    notify('Erreur lors de l\'envoi de l\'avis', 'error');
  }
};

// --- ROUTING ---
const routes={
  '/'     :()=>{guard();content.innerHTML=homePage();fetchItems('offer');hdr();},
  '/offres':()=>{guard();content.innerHTML=offresPage();fetchItems('offer');hdr();setCatActive();},
  '/demandes':()=>{guard();content.innerHTML=demandesPage();fetchItems('demand');hdr();setCatActive();},
  '/messages':()=>{guard();content.innerHTML=messagesPage();loadMessages();hdr();},
  '/prets':()=>{guard();content.innerHTML=pretsPage();loadLoans();hdr();},
  '/profil':()=>{guard();renderMyProfile();},
  '/profile/:id':(id)=>{guard();renderProfile(id);hdr();},
  '/login':()=>{content.innerHTML=loginPage();},
  '/register':()=>{content.innerHTML=registerPage();},
  '/association':()=>{content.innerHTML=associationPage();hdr();},
};
function guard(){if(!isLoggedIn())return navigate('/login');}
function hdr(){
  const u=getUser();
  if(u){
    const avatar=$('headerAvatar');
    if(avatar) {
      if (u.photo_url) {
        avatar.src = u.photo_url;
      } else {
        avatar.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=00635d&color=fff`;
      }
    }
  }
  
  // Update active nav link
  const path = location.pathname;
  document.querySelectorAll('#mainNav .nav-link').forEach(link => {
    const isHome = path === '/' && link.getAttribute('href') === '/';
    const isOther = link.getAttribute('href') !== '/' && path.startsWith(link.getAttribute('href'));
    const isActive = isHome || isOther;
    
    link.classList.toggle('active', isActive);
    link.classList.toggle('text-duck', isActive);
    link.classList.toggle('text-gray-400', !isActive);
  });

  updateUnreadBadge();
  checkOverdueLoans();
}

async function checkOverdueLoans(){
  const u=getUser();if(!u)return;
  // Overdue check
  const resOverdue = await fetch(`${API}/loans/overdue/${u.id}`);
  const overdue = await resOverdue.json().catch(() => []);
  if (overdue.length > 0) {
    // Show modal for the first one
    const tx = overdue[0];
    const isOwner = tx.owner_id === u.id;
    const otherName = isOwner ? tx.borrower_name : tx.owner_name;
    const modal = $('overdueLoanModal');
    if (modal && modal.classList.contains('hidden') && !sessionStorage.getItem(`overdue_seen_${tx.id}`)) {
      sessionStorage.setItem(`overdue_seen_${tx.id}`, 'true');
      $('overdueTitle').textContent = `Prêt en retard : ${tx.item_name}`;
      $('overdueText').innerHTML = `Le prêt de <b>${tx.item_name}</b> avec ${otherName} aurait dû se terminer le ${fmtDate(tx.end_date)}. L'avez-vous bien récupéré / rendu ?`;
      modal.dataset.loanId = tx.id;
      modal.classList.remove('hidden');
    }
  }

  const res=await fetch(`${API}/loans/user/${u.id}`);
  const loans=await res.json();
  const active=loans.find(l=>l.status==='accepted');
  const banner=$('activeLoanBanner');
  if(active){
    if(!banner){
      const b=document.createElement('div');
      b.id='activeLoanBanner';
      b.className='bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center sticky top-0 z-[40] animate-slide-in flex justify-center items-center gap-3';
      b.innerHTML=`<span>⚡ Vous avez un prêt en cours : ${active.item_name}</span> <button onclick="navigate('/prets')" class="underline">Voir</button>`;
      document.body.prepend(b);
    } else {
      // Update banner if overdue
      const isOverdue = active.end_date && new Date(active.end_date) < new Date(new Date().setHours(0,0,0,0));
      if (isOverdue && !active.end_requested_by) {
        banner.className = 'bg-red-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center sticky top-0 z-[40] animate-slide-in flex justify-center items-center gap-3';
        banner.innerHTML=`<span>🔴 RETOUR EN RETARD : ${active.item_name}</span> <button onclick="navigate('/prets')" class="underline">Voir</button>`;
      }
    }
  } else if(banner) banner.remove();
}

window.confirmReturnFromModal=async()=>{
  const modal = $('overdueLoanModal');
  const loanId = modal.dataset.loanId;
  if (!loanId) return;
  
  const u = getUser();
  const res = await fetch(`${API}/loans/user/${u.id}`);
  const loans = await res.json();
  const tx = loans.find(l => l.id == loanId);
  
  if (!tx) { hideModal('overdueLoanModal'); return; }

  const otherId = tx.owner_id === u.id ? tx.borrower_id : tx.owner_id;
  
  hideModal('overdueLoanModal');
  handleLoanAndUpdate(tx.id, 'completed', tx.item_id, otherId);
};

window.showExtensionForm=()=> {
  $('overdueActions').classList.add('hidden');
  $('extensionForm').classList.remove('hidden');
}

window.hideExtensionForm=()=> {
  $('overdueActions').classList.remove('hidden');
  $('extensionForm').classList.add('hidden');
}

window.submitExtension=async()=>{
  const modal = $('overdueLoanModal');
  const loanId = modal.dataset.loanId;
  const date = $('extendUntil').value;
  if (!loanId || !date) return;
  
  await fetch(`${API}/loans/${loanId}/extend`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({new_end_date: date, requester_id: getUser().id})});
  
  hideExtensionForm();
  hideModal('overdueLoanModal');
  notify('Demande d\'extension envoyée');
  if (location.pathname==='/messages') loadMessages();
};

window.promptExtension = (loanId) => {
    const modal = $('extendLoanModal');
    if (!modal) return;
    modal.dataset.loanId = loanId;
    $('newExtendUntil').value = '';
    showModal('extendLoanModal');
};

window.submitNewExtension = async () => {
    const modal = $('extendLoanModal');
    const loanId = modal.dataset.loanId;
    const date = $('newExtendUntil').value;
    if (!loanId || !date) return notify('Veuillez choisir une date', 'error');
    
    await fetch(`${API}/loans/${loanId}/extend`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({new_end_date: date, requester_id: getUser().id})});
    
    hideModal('extendLoanModal');
    notify('Demande d\'extension envoyée');
    if (location.pathname==='/messages') loadMessages();
};

window.navigate=(p)=>{history.pushState({},'',p);handleRoute();};
const handleRoute=()=>{
  const p=location.pathname;
  const itemMatch=p.match(/^\/item\/(\d+)$/);
  if(itemMatch)return renderDetail(itemMatch[1]);
  
  const profileMatch=p.match(/^\/profile\/(\d+)$/);
  if(profileMatch)return renderProfile(profileMatch[1]);

  (routes[p]||routes['/'])();
  scrollTo(0,0);
  checkOverdueLoans();
  if(window.lucide)lucide.createIcons();
};
window.onpopstate=handleRoute;
document.addEventListener('click',e=>{if(e.target.tagName==='A'&&e.target.getAttribute('href')?.startsWith('/')){e.preventDefault();navigate(e.target.getAttribute('href'));}});

// --- WEBSOCKET ---
function initWS(){if(!isLoggedIn())return;const u=getUser();if(socket)socket.close();
  socket=new WebSocket(`${WS_URL}/${u.id}`);
  socket.onmessage=async e=>{const m=JSON.parse(e.data);
    const types = ['NEW_MESSAGE', 'LOAN_ACCEPTED', 'LOAN_REJECTED', 'LOAN_REQUEST', 'DISCUSSION_ENDED'];
    if(types.includes(m.type)){
      updateUnreadBadge();
      if(location.pathname==='/messages') loadMessages();
      if(m.type==='NEW_MESSAGE') notify(`Nouveau message de ${m.data.sender_name || 'un utilisateur'}`);
      if(m.type==='LOAN_ACCEPTED') notify('Prêt accepté !');
      if(m.type==='LOAN_REJECTED') notify('Prêt refusé.','error');
      if(m.type==='LOAN_REQUEST') notify('Nouvelle demande de prêt !');
      if(m.type==='DISCUSSION_ENDED') {
        const u = getUser();
        const itemRes = await fetch(`${API}/items/${m.data.item_id}`);
        const item = await itemRes.json().catch(()=>({}));

        // Hide discussion from messages list for this user too
        await fetch(`${API}/messages/end-discussion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:m.data.item_id,user_id:u.id})});

        if (m.data.loan_id && m.data.other_id) {
           currentTransactionId = m.data.loan_id;
           currentRevieweeId = m.data.other_id;
           currentItemId = m.data.item_id;
           currentRating = 0;
           $('reviewComment').value = '';
           document.querySelectorAll('.star-btn').forEach(btn => btn.classList.add('grayscale'));
           
           const txsRes = await fetch(`${API}/loans/user/${u.id}`);
           const txs = await txsRes.json();
           const tx = txs.find(t => t.id === m.data.loan_id);
           const otherName = tx ? (tx.owner_id === u.id ? tx.borrower_name : tx.owner_name) : 'cet utilisateur';
           $('reviewTargetName').textContent = `Comment s'est passé l'échange avec ${otherName} ?`;

           if (item.owner_id === u.id) {
              $('reLendOption').classList.remove('hidden');
              currentReLendChoice = true;
              $('reLendYes').onclick = () => { 
                 currentReLendChoice = true;
                 $('reLendYes').classList.add('bg-emerald-50','border-emerald-600');
                 $('reLendNo').classList.remove('bg-gray-50','border-gray-300');
              };
              $('reLendNo').onclick = () => { 
                 currentReLendChoice = false;
                 $('reLendNo').classList.add('bg-gray-50','border-gray-300');
                 $('reLendYes').classList.remove('bg-emerald-50','border-emerald-600');
              };
              $('reLendYes').classList.add('bg-emerald-50','border-emerald-600');
              $('reLendNo').classList.remove('bg-gray-50','border-gray-300');
           } else {
              $('reLendOption').classList.add('hidden');
           }
           showModal('reviewModal');
        } else if (item.owner_id === u.id) {
           const modal = $('lendAgainModal');
           if (modal) {
             modal.classList.remove('hidden');
             $('reLendYesBtn').onclick = () => { modal.classList.add('hidden'); window.reLendItem(m.data.item_id, true); };
             $('reLendNoBtn').onclick = () => { modal.classList.add('hidden'); window.reLendItem(m.data.item_id, false); };
           }
        }

        notify('Prêt terminé - Discussion fermée.');
        const [itemId] = activeConv?.split('_') || [];
        if (Number(itemId) === m.data.item_id) {
           activeConv = null;
           localStorage.removeItem('activeConv');
           handleRoute(); // refresh view
        }
      }
    }
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
  let photo = u.photo_url;
  const f=$('editPhoto').files[0];
  if(f) photo = await readImgB64(f);
  
  const res=await fetch(`${API}/users/${u.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('editName').value,school:$('editSchool').value,photo_url:photo})});
  if(res.ok){
    const updated = await res.json();
    localStorage.setItem('user',JSON.stringify(updated));
    handleRoute();
    hdr();
    notify('Profil mis à jour !');
    $('editProfileSection').classList.add('hidden');
  } else {
    notify('Erreur lors de la mise à jour.', 'error');
  }
};

// --- ITEMS ---
async function fetchItems(type='offer'){
  const params=new URLSearchParams();
  if(activeCat&&activeCat!=='all')params.set('category',activeCat);
  const s=$('searchInput');if(s&&s.value)params.set('search',s.value);
  params.set('type', type);
  const items=await(await fetch(`${API}/items?${params}`)).json();
  const grid=type==='demand'?$('demandsGrid'):$('offersGrid');if(!grid)return;
  const uid=getUser()?.id||0;
  grid.innerHTML=items.filter(i=>i.owner_id!==uid).map(i=>itemCard(i)).join('')||'<div class="col-span-full text-center py-8 text-gray-400 text-sm">Aucune annonce trouvée.</div>';

  // Update Stats for Home
  if (location.pathname === '/') {
    const allOffers = await (await fetch(`${API}/items?type=offer`)).json();
    const statsAvailable = $('statsAvailable');
    if (statsAvailable) statsAvailable.textContent = allOffers.length;

    const resLoans = await fetch(`${API}/loans/user/${uid}`);
    const allLoans = await resLoans.json().catch(() => []);
    const ongoingCount = allLoans.filter(l => l.status === 'accepted').length;
    const statsOngoing = $('statsOngoing');
    if (statsOngoing) statsOngoing.textContent = ongoingCount;
  }

  if(window.lucide)lucide.createIcons();
}
window.doSearch=()=>fetchItems(location.pathname==='/demandes'?'demand':'offer');
window.filterCat=c=>{activeCat=c;fetchItems(location.pathname==='/demandes'?'demand':'offer');setCatActive();};
function setCatActive(){document.querySelectorAll('.cat-pill').forEach(b=>{b.classList.toggle('active',b.dataset.cat===activeCat);});}

window.addItem=async e=>{e.preventDefault();
  let photo='';const f=$('itemPhoto').files[0];if(f)photo=await readImgB64(f);
  await fetch(`${API}/items`,{method:'POST',headers:{'Content-Type':'application/json','X-Sharer-User-Id':getUser().id},
    body:JSON.stringify({name:$('itemName').value,category:$('itemCategory').value,quality:$('itemQuality').value,description:$('itemDesc').value,photo_url:photo,available_from:$('itemFrom').value||null,available_until:$('itemUntil').value||null,type:$('itemType')?$('itemType').value:'offer'})
  });
  window.hideModal('modal');fetchItems(location.pathname==='/demandes'?'demand':'offer');notify('Annonce publiée !');
};
window.deleteItem=async id=>{if(!confirm('Supprimer cette annonce ?'))return;
  await fetch(`${API}/items/${id}`,{method:'DELETE',headers:{'X-Sharer-User-Id':getUser().id}});fetchMyItems();notify('Annonce supprimée.');};

async function fetchMyItems(){
  const u=getUser();if(!u)return;
  const items=await(await fetch(`${API}/items?owner_id=${u.id}`)).json();
  const grid=$('myItemsGrid');if(!grid)return;
  grid.innerHTML=items.length?items.map(i=>`
    <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 hover:border-duck-light transition-all cursor-pointer group" onclick="if(event.target.tagName!=='BUTTON'&&event.target.tagName!=='svg'&&event.target.tagName!=='path')navigate('/item/${i.id}')">
      <div class="w-12 h-12 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden">${i.photo_url?`<img src="${i.photo_url}" class="w-full h-full object-cover">`:''}</div>
      <div class="flex-1 min-w-0"><h4 class="font-bold text-sm truncate group-hover:text-duck-light">${i.name}</h4><div class="text-[10px] ${i.status==='available'?'text-duck-light':'text-orange-500'} font-black uppercase">${i.status==='available'?'En ligne':i.status==='reserved'?'Réservé':'Prêté'}</div></div>
      <button onclick="event.stopPropagation();deleteItem(${i.id})" class="p-1.5 text-gray-400 hover:text-red-600"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z"/></svg></button>
    </div>`).join(''):'<div class="col-span-full text-center py-6 text-gray-400 text-sm">Aucune annonce.</div>';
  if(window.lucide)lucide.createIcons();
}

async function renderDetail(id){
  const res = await fetch(`${API}/items/${id}`);
  if(!res.ok){notify("Objet introuvable.","error");navigate("/");return;}
  const i=await res.json();
  if(!i || i.status === 'deleted'){notify("Cet objet a été supprimé.","error");navigate("/");return;}
  const isOwner=i.owner_id===getUser()?.id;
  content.innerHTML=itemDetail(i,isOwner);hdr();
}

async function renderProfile(id){
  const res = await fetch(`${API}/users/${id}`);
  if(!res.ok){notify("Utilisateur introuvable.","error");navigate("/");return;}
  const u = await res.json();
  const items = await (await fetch(`${API}/items?owner_id=${id}`)).json();
  content.innerHTML = userProfilePage(u, items);
  hdr();
}

async function renderMyProfile() {
  const u = getUser();
  if (!u.id) return;
  try {
    const res = await fetch(`${API}/users/${u.id}`);
    const latest = await res.json();
    localStorage.setItem('user', JSON.stringify(latest));
    content.innerHTML = profilPage(latest);
    fetchMyItems();
    hdr();
  } catch (e) {
    content.innerHTML = profilPage(u);
    fetchMyItems();
    hdr();
  }
}

// --- MESSAGES (2-column layout) ---
async function loadMessages(){
  const u=getUser();
  const res=await fetch(`${API}/messages/${u.id}`);
  allMessages=await res.json().catch(() => []);
  const groups={};
  allMessages.forEach(m=>{
    const amISender = Number(m.sender_id) === u.id;
    const otherId = amISender ? Number(m.receiver_id) : Number(m.sender_id);
    const otherName = amISender ? m.receiver_name : m.sender_name;
    const otherPhoto = amISender ? m.receiver_photo : m.sender_photo;
    const k = `${m.item_id}_${otherId}`; 
    if(!groups[k]) groups[k]={item:m.item_name,otherName:otherName,otherPhoto:otherPhoto,photo:m.item_photo,msgs:[],other:otherId,itemId:m.item_id,unread:0, key: k};
    groups[k].msgs.push(m);
    if(!m.is_read&&m.receiver_id===u.id)groups[k].unread++;
  });
  const convList=$('convList');if(!convList)return;
  const entries=Object.values(groups);
  if(!entries.length){convList.innerHTML='<div class="p-6 text-center text-xs text-gray-400">Aucune conversation.</div>';return;}
  convList.innerHTML=entries.map(g=>`
    <div class="conv-item ${activeConv===g.key?'active':''}" onclick="openConv('${g.key}',${g.itemId},${g.other})">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-full overflow-hidden bg-duck/10 flex-shrink-0">
          ${g.otherPhoto ? `<img src="${g.otherPhoto}" class="w-full h-full object-cover">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(g.otherName)}&background=00635d&color=fff" class="w-full h-full object-cover">`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center"><span class="font-bold text-sm truncate">${g.otherName}</span>${g.unread?`<span class="bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">${g.unread}</span>`:''}</div>
          <div class="text-[10px] text-duck font-bold truncate">${g.item}</div>
          <div class="text-xs text-gray-400 truncate">${g.msgs[g.msgs.length-1].content}</div>
        </div>
      </div>
    </div>`).join('');
  if(activeConv) {
    const active = groups[activeConv];
    if(active) {
      renderChat(active.itemId, active.other);
    } else {
      // Fallback: try to get itemId and otherId from the key
      const [itemId, otherId] = activeConv.split('_');
      if(itemId && otherId) renderChat(Number(itemId), Number(otherId));
    }
  }
  updateUnreadBadge();
}

window.openConv=async(key,itemId,other)=>{
  activeConv=key;
  localStorage.setItem('activeConv', key);
  await fetch(`${API}/messages/read-all`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:itemId,user_id:getUser().id})});
  renderChat(itemId,other);
  loadMessages();
  document.querySelector('.conv-sidebar')?.classList.add('hidden-mobile');
  $('chatPanel')?.classList.remove('hidden-mobile');
};

window.showConvList=()=>{
  document.querySelector('.conv-sidebar')?.classList.remove('hidden-mobile');
  $('chatPanel')?.classList.add('hidden-mobile');
};

window.toggleLoanForm=async()=>{
  const bar=$('chatInputBar');
  const itemId = Number(bar.dataset.itemId);
  const otherId = Number(bar.dataset.other);
  
  // Need to know if it's a demand or offer
  const itemRes = await fetch(`${API}/items/${itemId}`);
  const item = await itemRes.json().catch(()=>({}));
  
  if (item.type === 'demand') {
    window.handleProposeLoan(itemId, otherId);
    return;
  }

  const f = $('chatLoanFormContainer');
  const b = $('toggleLoanBtn');
  if (f.classList.contains('hidden')) {
    f.classList.remove('hidden');
    b.classList.add('active');
  } else {
    f.classList.add('hidden');
    b.classList.remove('active');
  }
};

window.sendLoanRequestFromChat=async()=>{
  const bar=$('chatInputBar');
  const itemId = Number(bar.dataset.itemId);
  const otherId = Number(bar.dataset.other);
  const sd=$('chatLoanFrom').value || null;
  const ed=$('chatLoanUntil').value || null;
  const u=getUser();
  
  const res=await fetch(`${API}/items/${itemId}/reserve`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({borrower_id:u.id,start_date:sd,end_date:ed})
  });
  
  if(res.ok){
    notify('Demande de prêt envoyée !');
    await toggleLoanForm();
    await loadMessages();
  } else {
    const err=await res.json().catch(()=>({}));
    notify(err.message||'Erreur lors de la demande.','error');
  }
};

async function renderChat(itemId,other){
  const u=getUser();
  const targetOther = Number(other);
  const targetItem = Number(itemId);
  
  const msgs=allMessages.filter(m=>Number(m.item_id)===targetItem && (Number(m.sender_id)===targetOther || Number(m.receiver_id)===targetOther));
  const header=$('chatHeader');const chatMsgs=$('chatMessages');const bar=$('chatInputBar');const info=$('chatInfoSidebar');
  if(!header||!chatMsgs)return;
  
  let itemName = msgs[0]?.item_name || 'Chargement...';
  let otherName = msgs[0]?.sender_id === u.id ? msgs[0]?.receiver_name : msgs[0]?.sender_name;
  let otherPhoto = msgs[0]?.sender_id === u.id ? msgs[0]?.receiver_photo : msgs[0]?.sender_photo;
  
  let isOwner=false;
  let isDemand=false;
  let itemData = null;
  try{
    const res = await fetch(`${API}/items/${targetItem}`);
    itemData=await res.json();
    isOwner=itemData.owner_id===u.id;
    isDemand=itemData.type==='demand';
    itemName = itemData.name;
    if (!otherName) {
       const otherRes = await fetch(`${API}/users/${targetOther}`);
       const otherD = await otherRes.json().catch(()=>({}));
       otherName = otherD.name || 'Utilisateur';
       otherPhoto = otherD.photo_url;
    }
  }catch{}

  if (info && itemData) {
    info.innerHTML = `
      <div>
        <h4>Objet</h4>
        <div class="chat-info-img mt-2">
          ${itemData.photo_url ? `<img src="${itemData.photo_url}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-4xl bg-white">${catIcon(itemData.category)}</div>`}
        </div>
        <div class="chat-info-item-name">${itemData.name}</div>
        <div class="flex gap-1.5 mt-2 flex-wrap">
          ${catBadge(itemData.category)}
          ${qBadge(itemData.quality)}
          ${dispoBadge(itemData.available_from, itemData.available_until, itemData.status)}
        </div>
      </div>
      <div class="chat-info-section">
        <h4>Description</h4>
        <div class="chat-info-desc">${itemData.description || 'Aucune description.'}</div>
      </div>
      <div class="chat-info-section">
        <h4>Propriétaire</h4>
        <div class="flex items-center gap-2 mt-2">
          <div class="w-8 h-8 rounded-full overflow-hidden bg-duck/10">
            ${itemData.owner_photo ? `<img src="${itemData.owner_photo}" class="w-full h-full object-cover">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(itemData.owner_name)}&background=00635d&color=fff" class="w-full h-full object-cover">`}
          </div>
          <div>
            <div class="font-bold text-xs text-gray-900">${itemData.owner_name || '...'}</div>
            ${stars(itemData.owner_rating, itemData.owner_transaction_count)}
          </div>
        </div>
      </div>
      <div class="mt-auto pt-6">
        <button onclick="navigate('/item/${itemData.id}')" class="w-full py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">Voir l'annonce</button>
      </div>
    `;
  }


  const txRes = await fetch(`${API}/loans/active/${targetItem}/${u.id}?otherId=${targetOther}`);
  const tx = await txRes.json().catch(() => null);
  
  let statusBanner = '';

  if (tx && tx.id) {
    if (tx.status === 'accepted') {
      const hasRequestedEnd = tx.end_requested_by;
      
      statusBanner = `
        <div class="bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center justify-between border-b border-emerald-100">
          <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Prêt en cours</div>
          ${hasRequestedEnd ? '<span class="text-[9px] text-emerald-600 opacity-60">Fin demandée</span>' : `
            <div class="flex gap-2">
              <button onclick="promptExtension(${tx.id})" class="bg-blue-600 text-white px-3 py-1 rounded shadow-sm hover:bg-blue-700 transition-colors">Prolonger</button>
              <button onclick="handleLoanAndUpdate(${tx.id},'request_end',${targetItem},${targetOther})" class="bg-emerald-600 text-white px-3 py-1 rounded shadow-sm hover:bg-emerald-700 transition-colors">Terminer</button>
            </div>`}
        </div>`;
    }
  }

  header.innerHTML=`
    <div class="w-full">
      <div class="flex items-center p-3">
        <button class="md:hidden text-gray-400 mr-2 p-2" onclick="showConvList()">←</button>
        <div class="w-9 h-9 rounded-full overflow-hidden bg-duck/10 mr-3 flex-shrink-0">
          ${otherPhoto ? `<img src="${otherPhoto}" class="w-full h-full object-cover">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=00635d&color=fff" class="w-full h-full object-cover">`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm text-gray-900 truncate">${otherName || '...'}</div>
          <div class="text-[11px] text-gray-500 font-medium truncate flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block"></span> ${itemName}
          </div>
        </div>
      </div>
      ${statusBanner}
    </div>`;
  
  header.classList.remove('p-3'); 
  
  if (msgs.length === 0) {
    chatMsgs.innerHTML = '<div class="p-10 text-center text-gray-400 text-xs">Démarrage de la discussion...</div>';
  } else {
    chatMsgs.innerHTML=msgs.map(m=>{
      const isSent = m.sender_id===u.id;
    const time=new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    
    // --- SPECIAL MESSAGE TYPES ---
    if (m.type === 'system' || m.type === 'loan_response') {
      return`<div><div class="msg-bubble system">${m.content}</div><div class="text-[10px] text-gray-300 mt-1 text-center">${time}</div></div>`;
    }
    
    if (m.type === 'loan_request') {
      const cls = isSent ? 'sent' : 'received';
      const meta = m.meta ? JSON.parse(m.meta) : {};
      const title = meta.item_name ? 'Proposition de prêt' : 'Demande de prêt';
      
      let actions = '';
      if (!isSent) {
        if (m.loan_status === 'pending') {
          actions = `
            <div class="msg-loan-card-actions">
              <button class="btn-accept" onclick="handleLoanAndUpdate(${m.loan_id},'accepted',${targetItem},${targetOther})">Accepter</button>
              <button class="btn-reject" onclick="handleLoanAndUpdate(${m.loan_id},'rejected',${targetItem},${targetOther})">Refuser</button>
            </div>
          `;
        } else if (m.loan_status) {
          actions = `<div class="px-3 pb-3 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">${m.loan_status === 'accepted' ? 'Accepté' : (m.loan_status === 'rejected' ? 'Refusé' : 'Terminé')}</div>`;
        } else {
          actions = `<div class="px-3 pb-3 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Traitée</div>`;
        }
      }
      
      return `
        <div class="msg-loan-card ${cls}">
          <div class="msg-loan-card-header text-xs font-bold text-gray-500 flex justify-between items-center">
            <span>${title}</span>
            <span class="text-[10px] text-gray-400 font-normal">${time}</span>
          </div>
          <div class="msg-loan-card-body">
            ${meta.item_name ? `<div class="text-[10px] text-emerald-600 font-black uppercase mb-1">Objet : ${meta.item_name}</div>` : ''}
            <div class="font-bold text-sm mb-1">${meta.start_date ? `${fmtDate(meta.start_date)} → ${fmtDate(meta.end_date)}` : 'Dates non précisées'}</div>
          </div>
          ${actions}
        </div>
      `;
    }

    if (m.type === 'extension_request') {
      const cls = isSent ? 'sent' : 'received';
      const meta = m.meta ? JSON.parse(m.meta) : {};
      
      let actions = '';
      if (!isSent) {
        // Assume active if end_date doesn't match new_end_date yet
        const isActive = tx && tx.status === 'accepted' && new Date(tx.end_date).toISOString().split('T')[0] !== meta.new_end_date;
        if (isActive) {
          actions = `
            <div class="msg-end-card-actions">
              <button class="btn-accept" onclick="respondToExtension(${tx.id}, true, '${meta.new_end_date}', ${targetItem}, ${targetOther})">Accepter</button>
              <button class="btn-reject" onclick="respondToExtension(${tx.id}, false, '${meta.new_end_date}', ${targetItem}, ${targetOther})">Refuser</button>
            </div>
          `;
        } else {
          actions = `<div class="mt-2 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Traitée</div>`;
        }
      }

      return `
        <div class="msg-end-card ${cls}">
          <div class="text-xs font-bold text-orange-600 flex items-center gap-1.5 mb-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Demande d'extension</div>
          <div class="font-bold text-sm text-gray-800">Jusqu'au ${fmtDate(meta.new_end_date)}</div>
          ${actions}
        </div>
      `;
    }

    if (m.type === 'end_request') {
      const cls = isSent ? 'sent' : 'received';
      let actions = '';
      if (!isSent && m.loan_end_requested_by && m.loan_end_requested_by !== u.id && m.loan_status === 'accepted') {
        actions = `
          <div class="msg-end-card-actions">
            <button class="btn-accept w-full" onclick="handleLoanAndUpdate(${m.loan_id},'completed',${targetItem},${targetOther})">✅ Oui, confirmer le retour</button>
          </div>
        `;
      } else if (!isSent && m.loan_status === 'completed') {
        actions = `<div class="mt-2 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Terminé</div>`;
      }

      return `
        <div class="msg-end-card ${cls} !bg-blue-50 !border-blue-200">
          <div class="text-xs font-bold text-blue-600 flex items-center gap-1.5 mb-1">Demande de fin de prêt</div>
          <div class="font-medium text-sm text-gray-800">L'objet a-t-il bien été récupéré / rendu ?</div>
          ${actions}
        </div>
      `;
    }

    // Standard text message
    const cls = isSent ? 'sent' : 'received';
    return`<div><div class="msg-bubble ${cls}">${m.content}</div><div class="text-[10px] text-gray-300 mt-1 ${isSent?'text-right':''}">${time}</div></div>`;
  }).join('');
  
  chatMsgs.scrollTop=chatMsgs.scrollHeight;
  bar.classList.remove('hidden');
  bar.dataset.itemId=targetItem;bar.dataset.other=targetOther;
  }
  
  // Hide loan toggle if not allowed (already active, or I am the owner of an offer, or I am the requester of a demand)
  const canAction = !isOwner; 
  if ((tx && tx.id) || !canAction) {
    $('toggleLoanBtn')?.classList.add('hidden');
    $('chatLoanFormContainer')?.classList.add('hidden');
  } else {
    $('toggleLoanBtn')?.classList.remove('hidden');
    if (isDemand) {
       $('toggleLoanBtn').innerHTML = '🤝 Proposer';
    } else {
       $('toggleLoanBtn').innerHTML = '📅 Prêt';
    }
  }
}

window.respondToExtension=async(loanId, accepted, date, itemId, other)=>{
  await fetch(`${API}/loans/${loanId}/extend`,{
    method:'PATCH',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({accepted, new_end_date: date, requester_id: getUser().id})
  });
  loadMessages();
};

window.reLendItem = async (itemId, again) => {
  const u = getUser();
  if (again) {
    await fetch(`${API}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json', 'X-Sharer-User-Id': u.id},
      body: JSON.stringify({status: 'available'})
    });
    notify('Objet de nouveau disponible !');
  } else {
    await fetch(`${API}/items/${itemId}`, {
      method: 'DELETE',
      headers: {'X-Sharer-User-Id': u.id}
    });
    notify('Annonce supprimée.');
  }
  handleRoute(); // Refresh current view (profile or messages)
  if (location.pathname === '/messages') loadMessages();
};

window.handleLoanAndUpdate=async(id,status,itemId,other)=>{
  await fetch(`${API}/loans/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status, requester_id: getUser().id})});
  
  if (status === 'completed') {
    const u = getUser();
    const itemRes = await fetch(`${API}/items/${itemId}`);
    const item = await itemRes.json().catch(()=>({}));
    
    // Automatically end discussion to hide it from messages list
    await fetch(`${API}/messages/end-discussion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:itemId,user_id:u.id})});
    
    // Prepare Review Modal
    currentTransactionId = id;
    currentRevieweeId = other;
    currentItemId = itemId;
    currentRating = 0;
    $('reviewComment').value = '';
    document.querySelectorAll('.star-btn').forEach(btn => btn.classList.add('grayscale'));
    
    // Get other user name
    const txsRes = await fetch(`${API}/loans/user/${u.id}`);
    const txs = await txsRes.json();
    const tx = txs.find(t => t.id === id);
    const otherName = tx ? (tx.owner_id === u.id ? tx.borrower_name : tx.owner_name) : 'cet utilisateur';
    $('reviewTargetName').textContent = `Comment s'est passé l'échange avec ${otherName} ?`;

    // Show re-lend option only for owner
    if (item.owner_id === u.id) {
       $('reLendOption').classList.remove('hidden');
       currentReLendChoice = true; // Default to yes
       $('reLendYes').onclick = () => { 
          currentReLendChoice = true;
          $('reLendYes').classList.add('bg-emerald-50','border-emerald-600');
          $('reLendNo').classList.remove('bg-gray-50','border-gray-300');
       };
       $('reLendNo').onclick = () => { 
          currentReLendChoice = false;
          $('reLendNo').classList.add('bg-gray-50','border-gray-300');
          $('reLendYes').classList.remove('bg-emerald-50','border-emerald-600');
       };
       // Initial state for buttons
       $('reLendYes').classList.add('bg-emerald-50','border-emerald-600');
       $('reLendNo').classList.remove('bg-gray-50','border-gray-300');
    } else {
       $('reLendOption').classList.add('hidden');
    }

    showModal('reviewModal');

    // Reset Chat view
    activeConv=null;
    localStorage.removeItem('activeConv');
    const header = $('chatHeader');
    const msgs = $('chatMessages');
    const bar = $('chatInputBar');
    const info = $('chatInfoSidebar');
    if(header) header.innerHTML='<div class="text-sm font-bold text-gray-500">Sélectionnez une conversation</div>';
    if(msgs) msgs.innerHTML='';
    if(bar) bar.classList.add('hidden');
    if(info) info.innerHTML='<div class="text-center py-20 text-gray-400 text-xs font-bold">Détails de l\'objet</div>';
    
    notify('Prêt terminé.');
  } else {
    notify(status==='accepted'?'Prêt accepté !':status==='rejected'?'Prêt refusé.':'Demande envoyée.');
  }
  
  await loadMessages();
};

window.handleProposeLoan=async(demandItemId,otherUserId)=>{
  const modal=$('proposeLoanModal');
  const form=$('proposeLoanForm');
  const select=$('propMyItemSelect');
  const newFields=$('newPropFields');
  if(!modal || !form || !select) return;

  const u = getUser();
  // Fetch my items to populate the select
  const myItems = await (await fetch(`${API}/items?owner_id=${u.id}`)).json().catch(()=>[]);
  select.innerHTML = '<option value="">-- Créer une nouvelle proposition --</option>' + 
    myItems.filter(i => i.type === 'offer' && i.status === 'available').map(i => `<option value="${i.id}" data-name="${i.name}" data-desc="${i.description}">${i.name}</option>`).join('');

  select.onchange = () => {
    if (select.value) {
      newFields.classList.add('hidden');
      $('propItemName').required = false;
      $('propItemDesc').required = false;
    } else {
      newFields.classList.remove('hidden');
      $('propItemName').required = true;
      $('propItemDesc').required = true;
    }
  };
  
  // Reset fields
  select.value = '';
  newFields.classList.remove('hidden');
  $('propItemName').value = '';
  $('propItemDesc').value = '';
  $('propFrom').value = '';
  $('propUntil').value = '';
  $('propItemName').required = true;
  $('propItemDesc').required = true;

  modal.classList.remove('hidden');

  form.onsubmit=async(e)=>{
    e.preventDefault();
    let proposalItemId = select.value;
    let name = $('propItemName').value;
    let desc = $('propItemDesc').value;
    const sd=$('propFrom').value;
    const ed=$('propUntil').value;

    // If a new item is being created
    if (!proposalItemId) {
      const resNew = await fetch(`${API}/items`,{method:'POST',headers:{'Content-Type':'application/json','X-Sharer-User-Id':u.id},
        body:JSON.stringify({name,category:'Autre',quality:'good',description:desc,photo_url:'',available_from:sd||null,available_until:ed||null,type:'offer'})
      });
      const newItem = await resNew.json();
      proposalItemId = newItem.id;
    } else {
      const opt = select.selectedOptions[0];
      name = opt.dataset.name;
      desc = opt.dataset.desc;
    }
    
    const res=await fetch(`${API}/items/${proposalItemId}/propose`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lender_id:u.id, borrower_id:otherUserId, item_name:name, item_desc:desc, start_date:sd, end_date:ed, discussion_item_id: demandItemId})
    });
    
    if(res.ok){
      notify('Proposition envoyée !');
      modal.classList.add('hidden');
      form.reset();
      await loadMessages();
    } else {
      notify('Erreur lors de la proposition.','error');
    }
  };
};

window.showEndModal=(itemId)=>{
  const m=$('confirmEndModal');if(!m)return;
  m.classList.remove('hidden');
  $('endConfirmBtn').onclick=async()=>{
    await fetch(`${API}/messages/end-discussion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_id:itemId,user_id:getUser().id})});
    m.classList.add('hidden');
    activeConv=null;
    localStorage.removeItem('activeConv');
    const header = $('chatHeader');
    const msgs = $('chatMessages');
    const bar = $('chatInputBar');
    if(header) header.innerHTML='<div class="text-sm font-bold text-gray-500">Sélectionnez une conversation</div>';
    if(msgs) msgs.innerHTML='';
    if(bar) bar.classList.add('hidden');
    loadMessages();
    notify('Discussion terminée');
  };
};

window.sendReply=async()=>{
  const bar=$('chatInputBar');const input=$('chatInput');
  if(!input.value.trim())return;
  const u=getUser();
  const itemId = Number(bar.dataset.itemId);
  const otherId = Number(bar.dataset.other);
  
  await fetch(`${API}/messages`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({item_id:itemId,sender_id:u.id,receiver_id:otherId,content:input.value})
  });
  input.value='';
  loadMessages();
};

window.initChat=async(itemId,ownerId)=>{
  const msg=$('detailChatInput')?.value;
  const u = getUser();
  if (msg) {
    await fetch(`${API}/messages`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({item_id:itemId,sender_id:u.id,receiver_id:ownerId,content:msg})
    });
  } else {
    // Just send a wave if empty
    await fetch(`${API}/messages`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({item_id:itemId,sender_id:u.id,receiver_id:ownerId,content:"👋 Bonjour !"})
    });
  }
  activeConv = `${itemId}_${ownerId}`;
  navigate('/messages');
};

window.requestLoan=async itemId=>{
  const u=getUser();const from=$('loanFrom')?.value;const until=$('loanUntil')?.value;
  const res=await fetch(`${API}/items/${itemId}/reserve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({borrower_id:u.id,start_date:from||null,end_date:until||null})});
  if(res.ok){notify('Demande de prêt envoyée !');navigate('/messages');}
  else{const err=await res.json().catch(()=>({}));notify(err.message||'Erreur lors de la demande.','error');}
};

window.requestLoanFromChat=async(itemId,other)=>{
  const modal=$('loanRequestModal');
  const form=$('loanRequestForm');
  if(!modal || !form) return;
  
  modal.classList.remove('hidden');
  
  form.onsubmit=async(e)=>{
    e.preventDefault();
    const sd=$('chatLoanFrom').value || null;
    const ed=$('chatLoanUntil').value || null;
    const u=getUser();
    
    const res=await fetch(`${API}/items/${itemId}/reserve`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({borrower_id:u.id,start_date:sd,end_date:ed})
    });
    
    if(res.ok){
      notify('Demande de prêt envoyée !');
      modal.classList.add('hidden');
      form.reset();
      loadMessages();
    } else {
      const err=await res.json().catch(()=>({}));
      notify(err.message||'Erreur lors de la demande.','error');
    }
  };
};

// --- LOANS ---
async function loadLoans(){
  const u=getUser();
  const res = await fetch(`${API}/loans/user/${u.id}`);
  const loans = await res.json().catch(() => []);
  const tableBody=$('loansTableBody');if(!tableBody)return;
  tableBody.innerHTML=loans.length?loans.map(t=>loanRow(t,u.id)).join(''):'<tr><td colspan="7" class="py-20 text-center text-gray-300 text-xs font-bold uppercase tracking-widest">Aucune demande trouvée.</td></tr>';
  if(window.lucide)lucide.createIcons();
  
  const paginationText = $('paginationText');
  if(paginationText) paginationText.textContent = `1-${loans.length} of ${loans.length}`;
}
window.handleLoan=async(id,status)=>{
  if (status === 'completed') {
    const u = getUser();
    const res = await fetch(`${API}/loans/user/${u.id}`);
    const loans = await res.json();
    const tx = loans.find(l => l.id == id);
    if (tx) {
      const otherId = tx.owner_id === u.id ? tx.borrower_id : tx.owner_id;
      return handleLoanAndUpdate(id, status, tx.item_id, otherId);
    }
  }
  await fetch(`${API}/loans/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status, requester_id: getUser().id})});
  notify(status==='accepted'?'Prêt accepté !':status==='rejected'?'Prêt refusé.':status==='request_end'?'Demande envoyée.':'Prêt terminé.');
  loadLoans();
};

// --- UNREAD BADGE ---
async function updateUnreadBadge(){
  if(!isLoggedIn())return;
  try{
    const u=getUser();
    const res=await fetch(`${API}/messages/${u.id}`);
    const msgs=await res.json().catch(() => []);
    const unread=msgs.filter(m=>!m.is_read&&m.receiver_id===u.id).length;
    const badge=$('unreadBadge');if(badge){badge.textContent=unread;badge.classList.toggle('hidden',!unread);}
  }catch{}
}

// --- INIT ---
if(isLoggedIn()){initWS();hdr();}
handleRoute();
setInterval(updateUnreadBadge,30000);
