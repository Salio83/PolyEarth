/**
 * @file app.js
 * @description Logique principale du frontend PolyEarth.
 * Gère le routage, l'authentification, les interactions en temps réel (WebSocket),
 * la gestion des annonces, des prêts et de la messagerie.
 */

import { 
  API, WS_URL, $, isLoggedIn, getUser, notify, readImgB64, fmtDate, catIcon, catBadge, qBadge, stars, dispoBadge, 
  showModal as sm, hideModal as hm 
} from './lib.js';

import { 
  homePage, offresPage, demandesPage, messagesPage, pretsPage, profilPage, userProfilePage, loginPage, registerPage, associationPage, 
  itemCard, demandCard, itemDetail, loanRow, adminPage 
} from './pages.js';

// =============================================================================
// --- VARIABLES GLOBALES ---
// =============================================================================

window.$ = $;
window.hideModal = hm;
let _calendarStart = null;
let _calendarEnd = null;
let _currentCalendarMonth = new Date().getMonth();
let _currentCalendarYear = new Date().getFullYear();

function renderCalendar() {
  const container = $('calendarContainer');
  if (!container) return;

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const daysOfWeek = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  let html = `
    <div class="border border-gray-200 rounded-xl p-3 bg-white select-none">
      <div class="flex justify-between items-center mb-2">
        <button type="button" onclick="changeCalendarMonth(-1)" class="p-1 hover:bg-gray-100 rounded-lg text-gray-500 text-xs font-bold">&larr;</button>
        <span class="font-bold text-xs text-gray-800">${monthNames[_currentCalendarMonth]} ${_currentCalendarYear}</span>
        <button type="button" onclick="changeCalendarMonth(1)" class="p-1 hover:bg-gray-100 rounded-lg text-gray-500 text-xs font-bold">&rarr;</button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 mb-1">
        ${daysOfWeek.map(d => `<div>${d}</div>`).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1">
  `;

  const firstDay = new Date(_currentCalendarYear, _currentCalendarMonth, 1);
  let firstDayIndex = firstDay.getDay(); 
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const lastDay = new Date(_currentCalendarYear, _currentCalendarMonth + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div></div>`;
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(_currentCalendarYear, _currentCalendarMonth, day);
    const isPast = d < today;
    
    let isSelectedStart = _calendarStart && d.getTime() === _calendarStart.getTime();
    let isSelectedEnd = _calendarEnd && d.getTime() === _calendarEnd.getTime();
    let isInRange = _calendarStart && _calendarEnd && d > _calendarStart && d < _calendarEnd;

    let btnClass = "w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[11px] font-bold transition-all ";
    if (isPast) {
      btnClass += "text-gray-300 cursor-not-allowed";
    } else if (isSelectedStart || isSelectedEnd) {
      btnClass += "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 cursor-pointer";
    } else if (isInRange) {
      btnClass += "bg-emerald-50 text-emerald-700 cursor-pointer";
    } else {
      btnClass += "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer";
    }

    const onClickAttr = isPast ? "" : `onclick="handleCalendarDayClick(${d.getTime()})"`;

    html += `
      <div class="flex justify-center items-center">
        <button type="button" ${onClickAttr} class="${btnClass}">${day}</button>
      </div>
    `;
  }

  html += `
      </div>
      <div class="mt-2.5 flex justify-between items-center text-[10px] font-semibold text-gray-500 border-t border-gray-100 pt-2">
        <span>Sélection :</span>
        <span class="text-emerald-700 font-bold">
          ${_calendarStart ? fmtDate(_calendarStart) : 'Début'} 
          ${_calendarEnd ? ` au ${fmtDate(_calendarEnd)}` : ''}
        </span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

window.handleCalendarDayClick = (timestamp) => {
  const clicked = new Date(timestamp);
  clicked.setHours(0,0,0,0);

  if (!_calendarStart || (_calendarStart && _calendarEnd)) {
    _calendarStart = clicked;
    _calendarEnd = null;
  } else if (_calendarStart && !_calendarEnd) {
    if (clicked < _calendarStart) {
      _calendarStart = clicked;
    } else {
      _calendarEnd = clicked;
    }
  }

  const fromInput = $('itemFrom');
  const untilInput = $('itemUntil');
  
  if (fromInput) {
    fromInput.value = _calendarStart ? _calendarStart.toISOString().split('T')[0] : '';
  }
  if (untilInput) {
    untilInput.value = _calendarEnd ? _calendarEnd.toISOString().split('T')[0] : '';
  }

  renderCalendar();
};

window.changeCalendarMonth = (offset) => {
  _currentCalendarMonth += offset;
  if (_currentCalendarMonth < 0) {
    _currentCalendarMonth = 11;
    _currentCalendarYear--;
  } else if (_currentCalendarMonth > 11) {
    _currentCalendarMonth = 0;
    _currentCalendarYear++;
  }
  renderCalendar();
};

window.onItemPhotoChange = async () => {
  const fileInput = $('itemPhoto');
  const file = fileInput?.files[0];
  const previewContainer = $('itemPhotoPreviewContainer');
  const previewImg = $('itemPhotoPreview');
  if (file) {
    const base64 = await readImgB64(file);
    if (previewImg) previewImg.src = base64;
    previewContainer?.classList.remove('hidden');
  } else {
    window.clearItemPhotoPreview();
  }
};

window.clearItemPhotoPreview = () => {
  const previewContainer = $('itemPhotoPreviewContainer');
  const previewImg = $('itemPhotoPreview');
  const fileInput = $('itemPhoto');
  if (fileInput) fileInput.value = '';
  if (previewImg) previewImg.src = '';
  previewContainer?.classList.add('hidden');
};

window.onItemTypeChange = () => {
  const type = $('itemType')?.value;
  const photoContainer = $('itemPhotoContainer');
  const calendarLabel = $('calendarLabel');
  
  if (type === 'demand') {
    photoContainer?.classList.add('hidden');
    if (calendarLabel) calendarLabel.textContent = "Période recherchée (optionnelle)";
  } else {
    photoContainer?.classList.remove('hidden');
    if (calendarLabel) calendarLabel.textContent = "Période de disponibilité (optionnelle)";
  }
  
  // Reset calendar state on type change
  _calendarStart = null;
  _calendarEnd = null;
  const fromInput = $('itemFrom');
  const untilInput = $('itemUntil');
  if (fromInput) fromInput.value = '';
  if (untilInput) untilInput.value = '';
  renderCalendar();
};

window.showModal = (id) => {
  sm(id);
  if (id === 'modal') {
    const typeSelect = $('itemType');
    if (typeSelect) {
      typeSelect.value = 'offer';
    }
    // Clear photo preview
    window.clearItemPhotoPreview();
    
    // Reset standard form inputs
    const nameInput = $('itemName');
    if (nameInput) nameInput.value = '';
    const descInput = $('itemDesc');
    if (descInput) descInput.value = '';
    const qualitySelect = $('itemQuality');
    if (qualitySelect) qualitySelect.value = 'good';
    
    // Reset calendar variables to current date/month
    _calendarStart = null;
    _calendarEnd = null;
    _currentCalendarMonth = new Date().getMonth();
    _currentCalendarYear = new Date().getFullYear();
    const fromInput = $('itemFrom');
    const untilInput = $('itemUntil');
    if (fromInput) fromInput.value = '';
    if (untilInput) untilInput.value = '';
    
    window.onItemTypeChange();
  }
};

const content = $('content');
let socket = null;
let activeCat = 'all';
let allMessages = [];
let activeConv = localStorage.getItem('activeConv') || null;

// =============================================================================
// --- SYSTÈME DE NOTATION (RATINGS) ---
// =============================================================================

let currentRating = 0;
let currentTransactionId = null;
let currentRevieweeId = null;
let currentItemId = null;
let currentReLendChoice = false;

/**
 * Définit la note (étoiles) dans la fenêtre modale de notation.
 * @param {number} n - Le nombre d'étoiles sélectionnées.
 */
window.setRating = (n) => {
  currentRating = n;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    if (i < n) {
      btn.classList.remove('grayscale');
    } else {
      btn.classList.add('grayscale');
    }
  });
};

/**
 * Soumet un avis (note et commentaire) pour une transaction terminée.
 */
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
    
    // Si le propriétaire a choisi de remettre l'objet en ligne immédiatement
    if (!$('reLendOption').classList.contains('hidden')) {
       await reLendItem(currentItemId, currentReLendChoice);
    }
    
    // Rafraîchissement de la vue actuelle
    handleRoute();
  } catch (e) {
    console.error(e);
    notify('Erreur lors de l\'envoi de l\'avis', 'error');
  }
};

// =============================================================================
// --- SYSTÈME DE ROUTAGE ---
// =============================================================================

/**
 * Définition des routes de l'application et de leurs gestionnaires.
 */
const routes = {
  '/': () => { if (!guard()) return; content.innerHTML = homePage(); fetchItems('offer'); hdr(); },
  '/offres': () => { if (!guard()) return; content.innerHTML = offresPage(); fetchItems('offer'); hdr(); setCatActive(); },
  '/demandes': () => { if (!guard()) return; content.innerHTML = demandesPage(); fetchItems('demand'); hdr(); setCatActive(); },
  '/messages': () => { if (!guard()) return; content.innerHTML = messagesPage(); loadMessages(); hdr(); },
  '/prets': () => { if (!guard()) return; content.innerHTML = pretsPage(); loadLoans(); hdr(); },
  '/profil': () => { if (!guard()) return; renderMyProfile(); },
  '/profile/:id': (id) => { if (!guard()) return; renderProfile(id); hdr(); },
  '/login': () => { 
    content.innerHTML = loginPage(); 
    if (window.lucide) lucide.createIcons();
  },
  '/register': () => {
    _wizardStep = 1;
    _wizardData.categories = [];
    _wizardData.freq = null;
    _wizardData.motiv = null;
    _wizardData.firstItem = '';
    _regFieldsValid = { name: false, email: false, password: false, phone: false };
    content.innerHTML = registerPage();
    if (window.lucide) lucide.createIcons();
  },
  '/association': () => { if (!guard()) return; content.innerHTML = associationPage(); hdr(); },
  '/admin': () => { if (!guard() || !getUser().is_admin) { navigate('/'); return; } content.innerHTML = adminPage(); loadAdminData(); hdr(); },
};

/**
 * Gardien de route pour vérifier si l'utilisateur est connecté.
 * @returns {boolean} True si autorisé, sinon redirige et retourne false.
 */
function guard() {
  if (!isLoggedIn()) {
    navigate('/login');
    return false;
  }
  return true;
}

/**
 * Met à jour l'en-tête (header) : avatar, liens actifs, badges.
 */
function hdr() {
  const u = getUser();
  if (u) {
    const avatar = $('headerAvatar');
    if (avatar) {
      if (u.photo_url) {
        avatar.src = u.photo_url;
      } else {
        avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=00635d&color=fff`;
      }
    }
  }
  
  // Afficher / Masquer l'onglet Administration selon le rôle de l'utilisateur
  const adminLink = $('adminNavLink');
  const adminLinkMobile = $('adminNavLinkMobile');
  const isAdmin = u && u.is_admin;
  if (adminLink) adminLink.classList.toggle('hidden', !isAdmin);
  if (adminLinkMobile) adminLinkMobile.classList.toggle('nav-hidden', !isAdmin);
  
  // Mise à jour de l'état actif des liens de navigation desktop
  const path = location.pathname;
  document.querySelectorAll('#mainNav .nav-link').forEach(link => {
    const isHome = path === '/' && link.getAttribute('href') === '/';
    const isOther = link.getAttribute('href') !== '/' && path.startsWith(link.getAttribute('href'));
    const isActive = isHome || isOther;
    
    link.classList.toggle('active', isActive);
    link.classList.toggle('text-duck', isActive);
    link.classList.toggle('text-gray-400', !isActive);
  });

  // Mise à jour de l'état actif des liens de navigation mobile
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    const linkHref = link.getAttribute('data-route') || link.getAttribute('href');
    const isHome = path === '/' && linkHref === '/';
    const isOther = linkHref !== '/' && path.startsWith(linkHref);
    const isActive = isHome || isOther;
    link.classList.toggle('active-nav', isActive);
  });

  updateUnreadBadge();
  checkOverdueLoans();
}

/**
 * Vérifie si l'utilisateur a des prêts en retard et affiche une alerte si nécessaire.
 */
async function checkOverdueLoans() {
  const u = getUser();
  if (!u || !u.id) return;
  
  // Récupération des prêts en retard
  const resOverdue = await fetch(`${API}/loans/overdue/${u.id}`);
  const overdue = await resOverdue.json().catch(() => []);
  
  if (overdue.length > 0) {
    // Affichage d'une fenêtre modale pour le premier retard trouvé
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

  // Gestion du bandeau d'information pour les prêts actifs
  const res = await fetch(`${API}/loans/user/${u.id}`);
  const loans = await res.json();
  const active = loans.find(l => l.status === 'accepted');
  const banner = $('activeLoanBanner');
  
  if (active) {
    if (!banner) {
      const b = document.createElement('div');
      b.id = 'activeLoanBanner';
      b.className = 'bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center sticky top-0 z-[40] animate-slide-in flex justify-center items-center gap-3';
      b.innerHTML = `<span>⚡ Vous avez un prêt en cours : ${active.item_name}</span> <button onclick="navigate('/prets')" class="underline">Voir</button>`;
      document.body.prepend(b);
    } else {
      // Mise à jour du bandeau si le prêt est en retard
      const isOverdue = active.end_date && new Date(active.end_date) < new Date(new Date().setHours(0,0,0,0));
      if (isOverdue && !active.end_requested_by) {
        banner.className = 'bg-red-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center sticky top-0 z-[40] animate-slide-in flex justify-center items-center gap-3';
        banner.innerHTML = `<span>🔴 RETOUR EN RETARD : ${active.item_name}</span> <button onclick="navigate('/prets')" class="underline">Voir</button>`;
      }
    }
  } else if (banner) {
    banner.remove();
  }
}

/**
 * Confirme le retour d'un objet via la modale de retard.
 */
window.confirmReturnFromModal = async () => {
  const modal = $('overdueLoanModal');
  const loanId = modal.dataset.loanId;
  if (!loanId) return;
  
  const u = getUser();
  const res = await fetch(`${API}/loans/user/${u.id}`);
  const loans = await res.json();
  const tx = loans.find(l => l.id == loanId);
  
  if (!tx) { 
    hideModal('overdueLoanModal'); 
    return; 
  }

  const otherId = tx.owner_id === u.id ? tx.borrower_id : tx.owner_id;
  
  hideModal('overdueLoanModal');
  handleLoanAndUpdate(tx.id, 'completed', tx.item_id, otherId);
};

/**
 * Affiche le formulaire de demande d'extension dans la modale de retard.
 */
window.showExtensionForm = () => {
  $('overdueActions').classList.add('hidden');
  $('extensionForm').classList.remove('hidden');
}

/**
 * Masque le formulaire de demande d'extension.
 */
window.hideExtensionForm = () => {
  $('overdueActions').classList.remove('hidden');
  $('extensionForm').classList.add('hidden');
}

/**
 * Soumet une demande d'extension de prêt depuis la modale de retard.
 */
window.submitExtension = async () => {
  const modal = $('overdueLoanModal');
  const loanId = modal.dataset.loanId;
  const date = $('extendUntil').value;
  if (!loanId || !date) return;
  
  await fetch(`${API}/loans/${loanId}/extend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      new_end_date: date, 
      requester_id: getUser().id 
    })
  });
  
  hideExtensionForm();
  hideModal('overdueLoanModal');
  notify('Demande d\'extension envoyée');
  if (location.pathname === '/messages') loadMessages();
};

/**
 * Affiche la modale pour demander une extension sur un prêt spécifique.
 * @param {number} loanId - L'ID de la transaction.
 */
window.promptExtension = (loanId) => {
    const modal = $('extendLoanModal');
    if (!modal) return;
    modal.dataset.loanId = loanId;
    $('newExtendUntil').value = '';
    showModal('extendLoanModal');
};

/**
 * Soumet une nouvelle demande d'extension (modale dédiée).
 */
window.submitNewExtension = async () => {
    const modal = $('extendLoanModal');
    const loanId = modal.dataset.loanId;
    const date = $('newExtendUntil').value;
    if (!loanId || !date) return notify('Veuillez choisir une date', 'error');
    
    await fetch(`${API}/loans/${loanId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        new_end_date: date, 
        requester_id: getUser().id 
      })
    });
    
    hideModal('extendLoanModal');
    notify('Demande d\'extension envoyée');
    if (location.pathname === '/messages') loadMessages();
};

/**
 * Change l'URL et déclenche le routage.
 * @param {string} p - Le chemin cible.
 */
window.navigate = (p) => {
  history.pushState({}, '', p);
  handleRoute();
};

/**
 * Analyse l'URL actuelle et affiche la page correspondante.
 */
const handleRoute = () => {
  const p = location.pathname;
  
  // Gestion des routes dynamiques avec paramètres (RegExp)
  const itemMatch = p.match(/^\/item\/(\d+)$/);
  if (itemMatch) return renderDetail(itemMatch[1]);
  
  const profileMatch = p.match(/^\/profile\/(\d+)$/);
  if (profileMatch) return renderProfile(profileMatch[1]);

  // Exécution du gestionnaire de route ou redirection vers l'accueil
  (routes[p] || routes['/'])();
  
  scrollTo(0, 0);
  if (isLoggedIn()) checkOverdueLoans();
  if (window.lucide) lucide.createIcons();
};

window.onpopstate = handleRoute;

// Interception des clics sur les liens internes
document.addEventListener('click', e => {
  if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('/')) {
    e.preventDefault();
    navigate(e.target.getAttribute('href'));
  }
});

// =============================================================================
// --- TEMPS RÉEL (WEBSOCKET) ---
// =============================================================================

/**
 * Initialise la connexion WebSocket.
 */
function initWS() {
  if (!isLoggedIn()) return;
  try {
    const u = getUser();
    if (!u || !u.id) return;
    if (socket) socket.close();
    
    socket = new WebSocket(`${WS_URL}/${u.id}?token=${localStorage.getItem('token')}`);
    
    socket.onmessage = async e => {
      const m = JSON.parse(e.data);
      const types = ['NEW_MESSAGE', 'LOAN_ACCEPTED', 'LOAN_REJECTED', 'LOAN_REQUEST', 'DISCUSSION_ENDED'];
      
      if (types.includes(m.type)) {
        updateUnreadBadge();
        if (location.pathname === '/messages') loadMessages();
        
        // Notifications par type d'événement
        if (m.type === 'NEW_MESSAGE') notify(`Nouveau message de ${m.data.sender_name || 'un utilisateur'}`);
        if (m.type === 'LOAN_ACCEPTED') notify('Prêt accepté !');
        if (m.type === 'LOAN_REJECTED') notify('Prêt refusé.', 'error');
        if (m.type === 'LOAN_REQUEST') notify('Nouvelle demande de prêt !');
        
        // Cas particulier : fin de discussion (prêt terminé)
        if (m.type === 'DISCUSSION_ENDED') {
          const u = getUser();
          const itemRes = await fetch(`${API}/items/${m.data.item_id}`);
          const item = await itemRes.json().catch(() => ({}));
  
          // Masquer la discussion localement pour cet utilisateur
          await fetch(`${API}/messages/end-discussion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              item_id: m.data.item_id, 
              user_id: u.id 
            })
          });
  
          // Préparation de la fenêtre de notation si un prêt était lié
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
   
             // Si l'utilisateur actuel est le propriétaire, proposer de remettre en ligne ou de republier la demande
             if (item.owner_id === u.id) {
                $('reLendOption').classList.remove('hidden');
                const questionEl = $('reLendQuestionText');
                const yesBtn = $('reLendYes');
                const noBtn = $('reLendNo');
                
                if (item.type === 'demand') {
                  if (questionEl) questionEl.textContent = "Souhaitez-vous republier votre demande ?";
                  if (yesBtn) yesBtn.textContent = "OUI, rechercher";
                  if (noBtn) noBtn.textContent = "NON, trouvé";
                } else {
                  if (questionEl) questionEl.textContent = "Souhaitez-vous remettre cet objet en ligne ?";
                  if (yesBtn) yesBtn.textContent = "OUI, disponible";
                  if (noBtn) noBtn.textContent = "NON, fini";
                }
                
                currentReLendChoice = true;
                $('reLendYes').onclick = () => { 
                   currentReLendChoice = true;
                   $('reLendYes').classList.add('bg-emerald-50', 'border-emerald-600');
                   $('reLendNo').classList.remove('bg-gray-50', 'border-gray-300');
                };
                $('reLendNo').onclick = () => { 
                   currentReLendChoice = false;
                   $('reLendNo').classList.add('bg-gray-50', 'border-gray-300');
                   $('reLendYes').classList.remove('bg-emerald-50', 'border-emerald-600');
                };
                $('reLendYes').classList.add('bg-emerald-50', 'border-emerald-600');
                $('reLendNo').classList.remove('bg-gray-50', 'border-gray-300');
             } else {
                $('reLendOption').classList.add('hidden');
             }
             showModal('reviewModal');
          } else if (item.owner_id === u.id) {
             // Autre cas de fin sans transaction directe (ex: annulation)
             const modal = $('lendAgainModal');
             if (modal) {
               const titleEl = $('lendAgainTitle');
               const questionEl = $('lendAgainQuestionText');
               const yesBtn = $('reLendYesBtn');
               const noBtn = $('reLendNoBtn');
               
               if (item.type === 'demand') {
                 if (titleEl) titleEl.textContent = "Demande clôturée !";
                 if (questionEl) questionEl.textContent = "Souhaitez-vous republier votre demande pour que d'autres étudiants puissent la voir ?";
                 if (yesBtn) yesBtn.textContent = "Oui, rechercher";
                 if (noBtn) noBtn.textContent = "Non, c'est bon";
               } else {
                 if (titleEl) titleEl.textContent = "Prêt terminé ! 🥳";
                 if (questionEl) questionEl.textContent = "Souhaitez-vous remettre cet objet en ligne pour que d'autres étudiants puissent en profiter ?";
                 if (yesBtn) yesBtn.textContent = "Oui, avec plaisir";
                 if (noBtn) noBtn.textContent = "Non, c'est fini";
               }
               
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
             handleRoute(); // Rafraîchissement de la vue
          }
        }
      }
    };
    
    // Reconnexion automatique en cas de fermeture
    socket.onclose = () => setTimeout(initWS, 5000);
  } catch (err) {
    console.error("Erreur de connexion WebSocket:", err);
  }
}

// =============================================================================
// --- AUTHENTIFICATION ---
// =============================================================================

/**
 * Gère la soumission du formulaire de connexion.
 * @param {Event} e - L'événement de soumission.
 */
window.doLogin = async e => {
  e.preventDefault();
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: $('email').value, 
      password: $('password').value 
    })
  });
  
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    initWS();
    navigate('/');

    // Si un premier objet avait été renseigné pendant l'inscription, ouvrir le formulaire de publication
    const pendingItem = sessionStorage.getItem('pendingItem');
    if (pendingItem) {
      sessionStorage.removeItem('pendingItem');
      setTimeout(() => {
        // Ouvrir la modal de publication et pré-remplir le nom
        window.showModal('modal');
        const nameInput = $('itemName');
        if (nameInput) {
          nameInput.value = pendingItem;
          nameInput.focus();
        }
        notify(`🚀 Publie dès maintenant ton objet : "${pendingItem}" !`);
      }, 600);
    }
  } else {
    const err = await res.json().catch(() => ({}));
    notify(err.message || 'Identifiants incorrects.', 'error');
  }
};

// ============================================================
// WIZARD D'INSCRIPTION
// ============================================================
let _wizardStep = 1;
const _wizardData = { categories: [], freq: null, motiv: null, firstItem: '' };
let _regFieldsValid = { name: false, email: false, password: false, phone: false };
let _emailCheckTimeout = null;

// Helper to set styling of feedback and borders
function _setFieldValidity(input, feedbackEl, isValid, message) {
  if (!input || !feedbackEl) return;
  
  if (isValid === null) {
    // Neutral state
    input.classList.remove('border-red-400', 'border-emerald-400');
    input.classList.add('border-gray-100');
    feedbackEl.classList.add('hidden');
    feedbackEl.textContent = '';
    return;
  }
  
  if (isValid) {
    input.classList.remove('border-red-400', 'border-gray-100');
    input.classList.add('border-emerald-400');
    feedbackEl.classList.remove('hidden', 'text-red-500', 'text-blue-500');
    feedbackEl.classList.add('text-emerald-500');
    feedbackEl.textContent = message || '✓ Valide';
  } else {
    input.classList.remove('border-emerald-400', 'border-gray-100');
    input.classList.add('border-red-400');
    feedbackEl.classList.remove('hidden', 'text-emerald-500', 'text-blue-500');
    feedbackEl.classList.add('text-red-500');
    feedbackEl.textContent = message || 'Invalide';
  }
}

window.validateRegName = (input) => {
  const val = input.value.trim();
  const feedback = $('regNameFeedback');
  if (val.length === 0) {
    _regFieldsValid.name = false;
    _setFieldValidity(input, feedback, null);
  } else if (val.length < 2) {
    _regFieldsValid.name = false;
    _setFieldValidity(input, feedback, false, 'Le nom doit contenir au moins 2 caractères.');
  } else {
    _regFieldsValid.name = true;
    _setFieldValidity(input, feedback, true, '✓ Nom valide');
  }
  window.checkStep1Validity();
};

window.validateRegEmail = (input) => {
  const val = input.value.trim();
  const feedback = $('regEmailFeedback');
  
  clearTimeout(_emailCheckTimeout);
  
  if (val.length === 0) {
    _regFieldsValid.email = false;
    _setFieldValidity(input, feedback, null);
    window.checkStep1Validity();
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(val)) {
    _regFieldsValid.email = false;
    _setFieldValidity(input, feedback, false, 'Adresse e-mail invalide.');
    window.checkStep1Validity();
    return;
  }
  
  // Show checking state
  input.classList.remove('border-red-400', 'border-emerald-400', 'border-gray-100');
  feedback.classList.remove('hidden', 'text-red-500', 'text-emerald-500');
  feedback.classList.add('text-blue-500');
  feedback.textContent = 'Vérification de la disponibilité...';
  
  _emailCheckTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`${API}/auth/check-email?email=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          _regFieldsValid.email = false;
          _setFieldValidity(input, feedback, false, 'Cette adresse e-mail est déjà utilisée.');
        } else {
          _regFieldsValid.email = true;
          _setFieldValidity(input, feedback, true, '✓ Adresse e-mail disponible');
        }
      } else {
        _regFieldsValid.email = false;
        _setFieldValidity(input, feedback, false, 'Erreur lors de la vérification.');
      }
    } catch (_e) {
      _regFieldsValid.email = false;
      _setFieldValidity(input, feedback, false, 'Erreur de connexion.');
    }
    window.checkStep1Validity();
  }, 400);
};

window.validateRegPassword = (input) => {
  const val = input.value;
  const feedback = $('regPasswordFeedback');
  if (val.length === 0) {
    _regFieldsValid.password = false;
    _setFieldValidity(input, feedback, null);
  } else if (val.length < 8) {
    _regFieldsValid.password = false;
    _setFieldValidity(input, feedback, false, 'Le mot de passe doit faire au moins 8 caractères.');
  } else if (!/[a-zA-Z]/.test(val) || !/[0-9]/.test(val)) {
    _regFieldsValid.password = false;
    _setFieldValidity(input, feedback, false, 'Doit contenir au moins une lettre et un chiffre.');
  } else {
    _regFieldsValid.password = true;
    _setFieldValidity(input, feedback, true, '✓ Mot de passe fort');
  }
  window.checkStep1Validity();
};

window.validateRegPhone = (input) => {
  if (!input) return;
  const val = input.value.trim();
  const prefix = $('regPhonePrefix')?.value || '+33';
  const feedback = $('regPhoneFeedback');
  if (val.length === 0) {
    _regFieldsValid.phone = false;
    _setFieldValidity(input, feedback, null);
  } else {
    let rest = val.replace(/^0/, '');
    let cleanedRest = rest.replace(/[\s\-\.]/g, '');
    const fullPhone = prefix + cleanedRest;
    const cleanedFull = fullPhone.replace(/[\s\-\.]/g, '');
    const isValid = /^(\+?[0-9]{7,15})$/.test(cleanedFull);
    
    if (!isValid || !/^[0-9]+$/.test(cleanedRest)) {
      _regFieldsValid.phone = false;
      _setFieldValidity(input, feedback, false, 'Numéro de téléphone invalide.');
    } else {
      _regFieldsValid.phone = true;
      _setFieldValidity(input, feedback, true, '✓ Téléphone valide');
    }
  }
  window.checkStep1Validity();
};

window.checkStep1Validity = () => {
  const btn = $('wNextBtn1');
  if (!btn) return;
  
  const allValid = _regFieldsValid.name && _regFieldsValid.email && _regFieldsValid.password && _regFieldsValid.phone;
  if (allValid) {
    btn.disabled = false;
    btn.classList.remove('opacity-50');
  } else {
    btn.disabled = true;
    btn.classList.add('opacity-50');
  }
};

window.wizardPrev = () => {
  if (_wizardStep <= 1) return;

  const current = $(`wStep${_wizardStep}`);
  const prev    = $(`wStep${_wizardStep - 1}`);
  if (!prev) return;

  // Animation sortie / entrée (inversée pour le retour en arrière)
  if (current) {
    current.style.opacity = '0';
    current.style.transform = 'translateX(30px)';
    current.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    setTimeout(() => {
      current.classList.add('hidden');
      current.style.opacity = '';
      current.style.transform = '';
      prev.style.opacity = '0';
      prev.style.transform = 'translateX(-30px)';
      prev.classList.remove('hidden');
      requestAnimationFrame(() => {
        prev.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        prev.style.opacity = '1';
        prev.style.transform = 'translateX(0)';
      });
    }, 250);
  }

  _wizardStep--;
  _wizardUpdateProgress(_wizardStep);
};

/** Met à jour la barre de progression */
function _wizardUpdateProgress(step) {
  const pct = Math.round(((step - 1) / 5) * 100);
  const prog = $('wizardProgress');
  const lbl  = $('wizardStepLabel');
  const pctEl = $('wizardPercent');
  if (prog) prog.style.width = pct + '%';
  if (lbl)  lbl.textContent  = `Étape ${step} / 6`;
  if (pctEl) pctEl.textContent = pct + '%';
}

/** Passe à l'étape suivante (appelé par les boutons du wizard) */
window.wizardNext = (e) => {
  if (e) e.preventDefault();

  // Validation étape 1
  if (_wizardStep === 1) {
    const name = $('regName')?.value.trim();
    const email = $('regEmail')?.value.trim();
    const pwd = $('regPassword')?.value;
    const phone = $('regPhone')?.value.trim();
    if (!name || !email || !pwd || pwd.length < 8) {
      notify('Merci de remplir tous les champs (mot de passe 8 car. min.)', 'error');
      return;
    }
    if (!phone || !/^[\+\d][\d\s\-\.]{6,}$/.test(phone)) {
      notify('Merci de saisir un numéro de téléphone valide.', 'error');
      return;
    }
  }

  // Validation étape 2
  if (_wizardStep === 2) {
    if (!_wizardData.categories || _wizardData.categories.length === 0) {
      notify('Merci de sélectionner au moins une catégorie.', 'error');
      return;
    }
  }

  // Validation étape 3
  if (_wizardStep === 3) {
    if (!_wizardData.freq) {
      notify('Merci de sélectionner une réponse.', 'error');
      return;
    }
  }

  // Validation étape 4
  if (_wizardStep === 4) {
    if (!_wizardData.motiv) {
      notify('Merci de sélectionner une réponse.', 'error');
      return;
    }
  }

  // Validation étape 5
  if (_wizardStep === 5) {
    const item = $('firstItemName')?.value.trim() || '';
    if (item.length < 2) {
      notify('Veuillez indiquer un objet d\'au moins 2 caractères.', 'error');
      return;
    }
    _wizardData.firstItem = item;
    // Calculer le score à l'étape 6
    _wizardShowScore();
  }

  const current = $(`wStep${_wizardStep}`);
  const next    = $(`wStep${_wizardStep + 1}`);
  if (!next) return;

  // Animation sortie / entrée
  if (current) {
    current.style.opacity = '0';
    current.style.transform = 'translateX(-30px)';
    current.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    setTimeout(() => {
      current.classList.add('hidden');
      current.style.opacity = '';
      current.style.transform = '';
      next.style.opacity = '0';
      next.style.transform = 'translateX(30px)';
      next.classList.remove('hidden');
      requestAnimationFrame(() => {
        next.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        next.style.opacity = '1';
        next.style.transform = 'translateX(0)';
      });
    }, 250);
  }

  _wizardStep++;
  _wizardUpdateProgress(_wizardStep);
};

/** Bascule la sélection d'un choix multiple (catégories) */
window.wizardToggle = (btn) => {
  const val = btn.dataset.val;
  const active = btn.classList.contains('border-emerald-500');
  if (active) {
    btn.classList.remove('border-emerald-500', 'bg-emerald-50', 'text-emerald-700');
    btn.classList.add('border-gray-100', 'text-gray-700');
    _wizardData.categories = _wizardData.categories.filter(v => v !== val);
  } else {
    btn.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-700');
    btn.classList.remove('border-gray-100', 'text-gray-700');
    _wizardData.categories.push(val);
  }

  const nextBtn = $('wNextBtn2');
  if (nextBtn) {
    if (_wizardData.categories.length > 0) {
      nextBtn.disabled = false;
      nextBtn.classList.remove('opacity-50');
    } else {
      nextBtn.disabled = true;
      nextBtn.classList.add('opacity-50');
    }
  }
};

window.wizardInputCheck = (input) => {
  const val = input.value.trim();
  const nextBtn = $('wNextBtn5');
  if (nextBtn) {
    if (val.length >= 2) {
      nextBtn.disabled = false;
      nextBtn.classList.remove('opacity-50');
    } else {
      nextBtn.disabled = true;
      nextBtn.classList.add('opacity-50');
    }
  }
};

/** Sélection unique (fréquence / motivation) */
window.wizardSingle = (btn, key) => {
  const group = btn.parentElement.querySelectorAll('.wizard-single');
  group.forEach(b => {
    b.classList.remove('border-emerald-500', 'bg-emerald-50', 'text-emerald-700');
    b.classList.add('border-gray-100', 'text-gray-700');
  });
  btn.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-700');
  btn.classList.remove('border-gray-100', 'text-gray-700');
  _wizardData[key] = btn.dataset.val;

  // Activer le bouton "Continuer"
  const nextBtn = $(`wNextBtn${_wizardStep}`);
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.classList.remove('opacity-50');
  }
};

/** Calcule et affiche le score PolyEarth */
function _wizardShowScore() {
  let score = 20; // base

  // +30 si au moins 2 catégories
  if (_wizardData.categories.length >= 2) score += 30;
  else if (_wizardData.categories.length === 1) score += 15;

  // +25 selon la fréquence
  const freqMap = { '0': 5, '1-3': 15, '4-10': 22, '10+': 25 };
  score += freqMap[_wizardData.freq] || 0;

  // +15 si motivation service ou all
  if (_wizardData.motiv === 'service' || _wizardData.motiv === 'all') score += 15;
  else if (_wizardData.motiv) score += 8;

  // +10 si premier objet renseigné
  if (_wizardData.firstItem) score += 10;

  score = Math.min(score, 100);

  // Messages selon score
  const msgs = [
    [85, '🌟 Incroyable ! Tu es un pilier de l\'économie du partage. PolyEarth a besoin de toi !'],
    [65, '🙌 Super profil ! Tu as plein d\'objets à partager, tu vas adorer PolyEarth.'],
    [45, '😊 Bon début ! Même un seul objet partagé change tout pour tes camarades.'],
    [0,  '🌱 Bienvenue ! Le partage, ça s\'apprend. On est là pour t\'aider à commencer.'],
  ];
  const msg = msgs.find(([min]) => score >= min)[1];

  setTimeout(() => {
    const circle = $('scoreCircle');
    const valEl  = $('scoreValue');
    const msgEl  = $('scoreMsg');
    const d1     = $('scoreDetail1');
    const d2     = $('scoreDetail2');

    if (circle) circle.style.strokeDashoffset = 264 - (264 * score / 100);

    // Compteur animé
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + 2, score);
      if (valEl) valEl.textContent = current;
      if (current >= score) clearInterval(interval);
    }, 20);

    if (msgEl) msgEl.textContent = msg;
    if (d1 && _wizardData.categories.length > 0)
      d1.textContent = `📦 Tu as des objets dans ${_wizardData.categories.length} catégorie(s) : ${_wizardData.categories.join(', ')}`;
    if (d2 && _wizardData.firstItem)
      d2.textContent = `🚀 Premier objet identifié : "${_wizardData.firstItem}"`;
  }, 400);
}

/** Soumet le formulaire d'inscription et crée le compte */
window.doRegisterWizard = async () => {
  const btn = $('wFinalBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Création en cours...'; }

  const name     = $('regName')?.value.trim();
  const email    = $('regEmail')?.value.trim();
  const password = $('regPassword')?.value;
  const prefix   = $('regPhonePrefix')?.value || '+33';
  const rawPhone = $('regPhone')?.value.trim();
  let restPhone  = rawPhone.replace(/^0/, '');
  const phone    = prefix + restPhone;

  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, phone })
  });

  if (res.ok) {
    notify('Compte créé ! Connexion automatique...');
    if (_wizardData.firstItem) {
      sessionStorage.setItem('pendingItem', _wizardData.firstItem);
    }
    
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (loginRes.ok) {
      const data = await loginRes.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      initWS();
      notify('Bienvenue sur PolyEarth ! 🌱');
      navigate('/');
      
      const pendingItem = sessionStorage.getItem('pendingItem');
      if (pendingItem) {
        sessionStorage.removeItem('pendingItem');
        setTimeout(() => {
          window.showModal('modal');
          const nameInput = $('itemName');
          if (nameInput) {
            nameInput.value = pendingItem;
            nameInput.focus();
          }
          notify(`🚀 Publie dès maintenant ton objet : "${pendingItem}" !`);
        }, 600);
      }
    } else {
      notify('Compte créé ! Connecte-toi maintenant.');
      navigate('/login');
    }
  } else {
    const err = await res.json().catch(() => ({}));
    notify(err.message || "Erreur lors de l'inscription.", 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Créer mon compte 🌱'; }
  }
};

/**
 * Déconnecte l'utilisateur et nettoie les données locales.
 */
window.doLogout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  if (socket) socket.close();
  navigate('/login');
};

/**
 * Met à jour le profil de l'utilisateur connecté.
 * @param {Event} e - L'événement de soumission.
 */
window.updateProfile = async e => {
  e.preventDefault();
  const u = getUser();
  let photo = u.photo_url;
  const f = $('editPhoto').files[0];
  if (f) photo = await readImgB64(f);

  const res = await fetch(`${API}/users/${u.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name: $('editName').value, 
      school: $('editSchool').value, 
      status: $('editStatus').value, 
      photo_url: photo 
    })
  });
  
  if (res.ok) {
    const updated = await res.json();
    localStorage.setItem('user', JSON.stringify(updated));
    handleRoute();
    hdr();
    notify('Profil mis à jour !');
    $('editProfileSection').classList.add('hidden');
  } else {
    notify('Erreur lors de la mise à jour.', 'error');
  }
};

// =============================================================================
// --- GESTION DES ANNONCES (ITEMS) ---
// =============================================================================

/**
 * Récupère et affiche les annonces (offres ou demandes) selon les filtres.
 * @param {string} type - Le type d'annonces ('offer' ou 'demand').
 */
async function fetchItems(type = 'offer') {
  const params = new URLSearchParams();
  if (activeCat && activeCat !== 'all') params.set('category', activeCat);
  const s = $('searchInput');
  if (s && s.value) params.set('search', s.value);
  params.set('type', type);
  
  const items = await (await fetch(`${API}/items?${params}`)).json();
  const grid = type === 'demand' ? $('demandsGrid') : $('offersGrid');
  if (!grid) return;
  
  const uid = getUser()?.id || 0;
  // On filtre pour ne pas voir ses propres annonces dans les flux publics
  grid.innerHTML = items.filter(i => i.owner_id !== uid).map(i => type === 'demand' ? demandCard(i) : itemCard(i)).join('') 
    || '<div class="col-span-full text-center py-8 text-gray-400 text-sm">Aucune annonce trouvée.</div>';

  // Mise à jour des statistiques sur la page d'accueil
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

  if (window.lucide) lucide.createIcons();
}

/**
 * Déclenche une recherche.
 */
window.doSearch = () => fetchItems(location.pathname === '/demandes' ? 'demand' : 'offer');

/**
 * Filtre les annonces par catégorie.
 * @param {string} c - Le nom de la catégorie.
 */
window.filterCat = c => {
  activeCat = c;
  fetchItems(location.pathname === '/demandes' ? 'demand' : 'offer');
  setCatActive();
};

/**
 * Met à jour l'apparence des boutons de catégorie (pilules).
 */
function setCatActive() {
  document.querySelectorAll('.cat-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === activeCat);
  });
}

/**
 * Ajoute une nouvelle annonce.
 * @param {Event} e - L'événement de soumission.
 */
window.addItem = async e => {
  e.preventDefault();
  let photo = '';
  const f = $('itemPhoto').files[0];
  if (f) {
    try {
      photo = await readImgB64(f);
    } catch (err) {
      console.error(err);
      notify("Erreur lors de la lecture de la photo", "error");
      return;
    }
  }
  
  try {
    const res = await fetch(`${API}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: $('itemName').value, 
        category: $('itemCategory').value, 
        quality: $('itemQuality').value, 
        description: $('itemDesc').value, 
        photo_url: photo, 
        available_from: $('itemFrom').value || null, 
        available_until: $('itemUntil').value || null, 
        type: $('itemType') ? $('itemType').value : 'offer' 
      })
    });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify(data.message || 'Erreur lors de la publication de l\'annonce.', 'error');
      return;
    }

    window.hideModal('modal');
    fetchItems(location.pathname === '/demandes' ? 'demand' : 'offer');
    notify('Annonce publiée !');
  } catch (err) {
    console.error(err);
    notify('Erreur de connexion.', 'error');
  }
};

/**
 * Supprime une annonce appartenant à l'utilisateur.
 * @param {number} id - L'ID de l'annonce.
 */
window.deleteItem = async id => {
  if (!confirm('Supprimer cette annonce ?')) return;
  await fetch(`${API}/items/${id}`, { method: 'DELETE' });
  fetchMyItems();
  notify('Annonce supprimée.');
};

/**
 * Récupère les annonces de l'utilisateur connecté pour l'affichage du profil.
 */
async function fetchMyItems() {
  const u = getUser();
  if (!u) return;
  
  const items = await (await fetch(`${API}/items?owner_id=${u.id}`)).json();
  const offersGrid = $('myOffersGrid');
  const demandsGrid = $('myDemandsGrid');
  if (!offersGrid || !demandsGrid) return;
  
  const offers = items.filter(i => i.type === 'offer');
  const demands = items.filter(i => i.type === 'demand');

  const itemRow = i => `
    <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 hover:border-duck-light transition-all cursor-pointer group" onclick="if(event.target.tagName!=='BUTTON'&&event.target.tagName!=='svg'&&event.target.tagName!=='path')navigate('/item/${i.id}')">
      ${i.type === 'offer' ? `
        <div class="w-12 h-12 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden">
          ${i.photo_url ? `<img src="${i.photo_url}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-xl bg-white">${catIcon(i.category)}</div>`}
        </div>
      ` : ''}
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-sm truncate group-hover:text-duck-light">${i.name}</h4>
        <div class="text-[10px] ${i.status === 'available' ? 'text-duck-light' : 'text-orange-500'} font-black uppercase">
          ${i.status === 'available' ? 'En ligne' : i.status === 'reserved' ? 'Réservé' : 'Prêté'}
        </div>
      </div>
      <button onclick="event.stopPropagation();deleteItem(${i.id})" class="p-1.5 text-gray-400 hover:text-red-600">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z"/></svg>
      </button>
    </div>`;

  offersGrid.innerHTML = offers.length ? offers.map(itemRow).join('') : '<div class="col-span-full py-6 text-gray-400 text-sm">Aucune offre.</div>';
  demandsGrid.innerHTML = demands.length ? demands.map(itemRow).join('') : '<div class="col-span-full py-6 text-gray-400 text-sm">Aucune demande.</div>';

  if (window.lucide) lucide.createIcons();
}

/**
 * Affiche la page de détail d'un objet.
 * @param {number} id - L'ID de l'objet.
 */
async function renderDetail(id) {
  const res = await fetch(`${API}/items/${id}`);
  if (!res.ok) {
    notify("Objet introuvable.", "error");
    navigate("/");
    return;
  }
  const i = await res.json();
  if (!i || i.status === 'deleted') {
    notify("Cet objet a été supprimé.", "error");
    navigate("/");
    return;
  }
  const isOwner = i.owner_id === getUser()?.id;
  const isAdmin = getUser()?.is_admin === true;
  content.innerHTML = itemDetail(i, isOwner, isAdmin);
  hdr();
}

window.deleteItem = async (id) => {
  if (!confirm("Voulez-vous vraiment supprimer cette annonce ? Cette action est irréversible.")) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/items/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      notify("Annonce supprimée avec succès.");
      navigate("/");
    } else {
      notify(data.message || "Erreur lors de la suppression.", "error");
    }
  } catch (e) {
    console.error(e);
    notify("Erreur réseau.", "error");
  }
};

/**
 * Affiche la page de profil public d'un utilisateur.
 * @param {number} id - L'ID de l'utilisateur.
 */
async function renderProfile(id) {
  const res = await fetch(`${API}/users/${id}`);
  if (!res.ok) {
    notify("Utilisateur introuvable.", "error");
    navigate("/");
    return;
  }
  const u = await res.json();
  const items = await (await fetch(`${API}/items?owner_id=${id}`)).json();
  content.innerHTML = userProfilePage(u, items);
  hdr();
}

/**
 * Affiche la page de profil de l'utilisateur actuel (mon profil).
 */
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

// =============================================================================
// --- MESSAGERIE (VUE EN 2 COLONNES) ---
// =============================================================================

/**
 * Charge toutes les discussions de l'utilisateur et affiche la liste latérale.
 */
async function loadMessages() {
  const u = getUser();
  const res = await fetch(`${API}/messages/${u.id}`);
  allMessages = await res.json().catch(() => []);
  
  const groups = {};
  allMessages.forEach(m => {
    const amISender = Number(m.sender_id) === u.id;
    const otherId = amISender ? Number(m.receiver_id) : Number(m.sender_id);
    const otherName = amISender ? m.receiver_name : m.sender_name;
    const otherPhoto = amISender ? m.receiver_photo : m.sender_photo;
    const k = `${m.item_id}_${otherId}`; 
    
    if (!groups[k]) {
      groups[k] = { 
        item: m.item_name, 
        otherName: otherName, 
        otherPhoto: otherPhoto, 
        photo: m.item_photo, 
        msgs: [], 
        other: otherId, 
        itemId: m.item_id, 
        unread: 0, 
        key: k 
      };
    }
    
    groups[k].msgs.push(m);
    if (!m.is_read && m.receiver_id === u.id) groups[k].unread++;
  });
  
  const convList = $('convList');
  if (!convList) return;
  
  const entries = Object.values(groups);
  if (!entries.length) {
    convList.innerHTML = '<div class="p-6 text-center text-xs text-gray-400">Aucune conversation.</div>';
    return;
  }
  
  convList.innerHTML = entries.map(g => `
    <div class="conv-item ${activeConv === g.key ? 'active' : ''}" onclick="openConv('${g.key}', ${g.itemId}, ${g.other})">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-full overflow-hidden bg-duck/10 flex-shrink-0">
          ${g.otherPhoto ? `<img src="${g.otherPhoto}" class="w-full h-full object-cover">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(g.otherName)}&background=00635d&color=fff" class="w-full h-full object-cover">`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center">
            <span class="font-bold text-sm truncate">${g.otherName}</span>
            ${g.unread ? `<span class="bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">${g.unread}</span>` : ''}
          </div>
          <div class="text-[10px] text-duck font-bold truncate">${g.item}</div>
          <div class="text-xs text-gray-400 truncate">${g.msgs[g.msgs.length - 1].content}</div>
        </div>
      </div>
    </div>`).join('');
    
  // Chargement automatique de la conversation active si elle existe
  if (activeConv) {
    const active = groups[activeConv];
    if (active) {
      renderChat(active.itemId, active.other);
    } else {
      // Fallback : extraction de l'ID objet et utilisateur depuis la clé
      const [itemId, otherId] = activeConv.split('_');
      if (itemId && otherId) renderChat(Number(itemId), Number(otherId));
    }
  }
  
  updateUnreadBadge();
}

/**
 * Ouvre une conversation spécifique.
 * @param {string} key - Clé unique de la conversation.
 * @param {number} itemId - ID de l'objet lié.
 * @param {number} other - ID de l'autre utilisateur.
 */
window.openConv = async (key, itemId, other) => {
  activeConv = key;
  localStorage.setItem('activeConv', key);
  
  // Marquage automatique de tous les messages comme lus
  await fetch(`${API}/messages/read-all`, {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ 
      item_id: itemId, 
      user_id: getUser().id 
    })
  });
  
  renderChat(itemId, other);
  loadMessages();
  
  // Gestion de l'affichage mobile
  document.querySelector('.conv-sidebar')?.classList.add('hidden-mobile');
  $('chatPanel')?.classList.remove('hidden-mobile');
};

/**
 * Retourne à la liste des conversations (sur mobile).
 */
window.showConvList = () => {
  document.querySelector('.conv-sidebar')?.classList.remove('hidden-mobile');
  $('chatPanel')?.classList.add('hidden-mobile');
};

/**
 * Alterne l'affichage du formulaire de demande de prêt dans le chat.
 */
window.toggleLoanForm = async () => {
  const bar = $('chatInputBar');
  const itemId = Number(bar.dataset.itemId);
  const otherId = Number(bar.dataset.other);
  
  // Vérification du type d'objet (offre ou demande)
  const itemRes = await fetch(`${API}/items/${itemId}`);
  const item = await itemRes.json().catch(() => ({}));
  
  if (item.type === 'demand') {
    window.handleProposeLoan(itemId, otherId);
    return;
  }

  const f = $('chatLoanFormContainer');
  const b = $('toggleLoanBtn');
  
  if (f.classList.contains('hidden')) {
    // Pré-remplissage des dates si disponibles
    if (item.available_from) $('chatLoanFrom').value = item.available_from.split('T')[0];
    if (item.available_until) $('chatLoanUntil').value = item.available_until.split('T')[0];
    
    f.classList.remove('hidden');
    b.classList.add('active');
  } else {
    f.classList.add('hidden');
    b.classList.remove('active');
  }
};

/**
 * Envoie une demande de prêt directement depuis l'interface de discussion.
 */
window.sendLoanRequestFromChat = async () => {
  const bar = $('chatInputBar');
  const itemId = Number(bar.dataset.itemId);
  const otherId = Number(bar.dataset.other);
  const sd = $('chatLoanFrom').value || null;
  const ed = $('chatLoanUntil').value || null;
  const u = getUser();
  
  const res = await fetch(`${API}/items/${itemId}/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      borrower_id: u.id, 
      start_date: sd, 
      end_date: ed 
    })
  });
  
  if (res.ok) {
    notify('Demande de prêt envoyée !');
    await toggleLoanForm();
    await loadMessages();
  } else {
    const err = await res.json().catch(() => ({}));
    notify(err.message || 'Erreur lors de la demande.', 'error');
  }
};

/**
 * Affiche le contenu d'une conversation dans le panneau de chat.
 * @param {number} itemId - ID de l'objet.
 * @param {number} other - ID de l'autre utilisateur.
 */
async function renderChat(itemId, other) {
  const u = getUser();
  const targetOther = Number(other);
  const targetItem = Number(itemId);
  
  // Filtrage des messages pour cette conversation spécifique
  const msgs = allMessages.filter(m => 
    Number(m.item_id) === targetItem && 
    (Number(m.sender_id) === targetOther || Number(m.receiver_id) === targetOther)
  );
  
  const header = $('chatHeader');
  const chatMsgs = $('chatMessages');
  const bar = $('chatInputBar');
  const info = $('chatInfoSidebar');
  
  if (!header || !chatMsgs) return;
  
  let itemName = msgs[0]?.item_name || 'Chargement...';
  let otherName = msgs[0]?.sender_id === u.id ? msgs[0]?.receiver_name : msgs[0]?.sender_name;
  let otherPhoto = msgs[0]?.sender_id === u.id ? msgs[0]?.receiver_photo : msgs[0]?.sender_photo;
  
  let isOwner = false;
  let isDemand = false;
  let itemData = null;
  
  try {
    const res = await fetch(`${API}/items/${targetItem}`);
    itemData = await res.json();
    isOwner = itemData.owner_id === u.id;
    isDemand = itemData.type === 'demand';
    itemName = itemData.name;
    
    if (!otherName) {
       const otherRes = await fetch(`${API}/users/${targetOther}`);
       const otherD = await otherRes.json().catch(() => ({}));
       otherName = otherD.name || 'Utilisateur';
       otherPhoto = otherD.photo_url;
    }
  } catch {}

  // Mise à jour de la barre latérale d'infos de l'objet
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

  // Vérification s'il y a une transaction active pour afficher le bandeau de statut
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
              <button onclick="handleLoanAndUpdate(${tx.id}, 'request_end', ${targetItem}, ${targetOther})" class="bg-emerald-600 text-white px-3 py-1 rounded shadow-sm hover:bg-emerald-700 transition-colors">Terminer</button>
            </div>`}
        </div>`;
    }
  }

  header.innerHTML = `
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
    chatMsgs.innerHTML = msgs.map(m => {
      const isSent = m.sender_id === u.id;
      const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      
      // --- TYPES DE MESSAGES SPÉCIAUX (Système, Prêt, Extension) ---
      
      if (m.type === 'system' || m.type === 'loan_response') {
        return `<div><div class="msg-bubble system">${m.content}</div><div class="text-[10px] text-gray-300 mt-1 text-center">${time}</div></div>`;
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
                <button class="btn-accept" onclick="handleLoanAndUpdate(${m.loan_id}, 'accepted', ${targetItem}, ${targetOther})">Accepter</button>
                <button class="btn-reject" onclick="handleLoanAndUpdate(${m.loan_id}, 'rejected', ${targetItem}, ${targetOther})">Refuser</button>
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
          // L'extension est active si la date de fin actuelle de la transaction diffère de la nouvelle date demandée
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
              <button class="btn-accept w-full" onclick="handleLoanAndUpdate(${m.loan_id}, 'completed', ${targetItem}, ${targetOther})">✅ Oui, confirmer le retour</button>
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

      // Message texte standard
      const cls = isSent ? 'sent' : 'received';
      return `<div><div class="msg-bubble ${cls}">${m.content}</div><div class="text-[10px] text-gray-300 mt-1 ${isSent ? 'text-right' : ''}">${time}</div></div>`;
    }).join('');
    
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    bar.classList.remove('hidden');
    bar.dataset.itemId = targetItem;
    bar.dataset.other = targetOther;
  }
  
  // Désactivation des actions de prêt si déjà en cours ou si l'utilisateur est le propriétaire
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

/**
 * Répond à une demande d'extension de prêt.
 */
window.respondToExtension = async (loanId, accepted, date, itemId, other) => {
  await fetch(`${API}/loans/${loanId}/extend`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: accepted ? 'accept' : 'reject', 
      new_end_date: date, 
      requester_id: getUser().id 
    })
  });
  loadMessages();
};

/**
 * Remet un objet en ligne ou le supprime après un prêt.
 */
window.reLendItem = async (itemId, again) => {
  const u = getUser();
  if (again) {
    await fetch(`${API}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'available' })
    });
    notify('Objet de nouveau disponible !');
  } else {
    await fetch(`${API}/items/${itemId}`, {
      method: 'DELETE'
    });
    notify('Annonce supprimée.');
  }
  handleRoute();
  if (location.pathname === '/messages') loadMessages();
};

/**
 * Met à jour le statut d'un prêt et rafraîchit l'interface.
 */
window.handleLoanAndUpdate = async (id, status, itemId, other) => {
  await fetch(`${API}/loans/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      status, 
      requester_id: getUser().id 
    })
  });
  
  if (status === 'completed') {
    const u = getUser();
    const itemRes = await fetch(`${API}/items/${itemId}`);
    const item = await itemRes.json().catch(() => ({}));
    
    // Fermeture automatique de la discussion
    await fetch(`${API}/messages/end-discussion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        item_id: itemId, 
        user_id: u.id 
      })
    });
    
    // Initialisation de la modale de notation
    currentTransactionId = id;
    currentRevieweeId = other;
    currentItemId = itemId;
    currentRating = 0;
    $('reviewComment').value = '';
    document.querySelectorAll('.star-btn').forEach(btn => btn.classList.add('grayscale'));
    
    const txsRes = await fetch(`${API}/loans/user/${u.id}`);
    const txs = await txsRes.json();
    const tx = txs.find(t => t.id === id);
    const otherName = tx ? (tx.owner_id === u.id ? tx.borrower_name : tx.owner_name) : 'cet utilisateur';
    $('reviewTargetName').textContent = `Comment s'est passé l'échange avec ${otherName} ?`;

    // Proposition de remise en ligne pour le propriétaire
    if (item.owner_id === u.id) {
       $('reLendOption').classList.remove('hidden');
       currentReLendChoice = true;
       $('reLendYes').onclick = () => { 
          currentReLendChoice = true;
          $('reLendYes').classList.add('bg-emerald-50', 'border-emerald-600');
          $('reLendNo').classList.remove('bg-gray-50', 'border-gray-300');
       };
       $('reLendNo').onclick = () => { 
          currentReLendChoice = false;
          $('reLendNo').classList.add('bg-gray-50', 'border-gray-300');
          $('reLendYes').classList.remove('bg-emerald-50', 'border-emerald-600');
       };
       $('reLendYes').classList.add('bg-emerald-50', 'border-emerald-600');
       $('reLendNo').classList.remove('bg-gray-50', 'border-gray-300');
    } else {
       $('reLendOption').classList.add('hidden');
    }

    showModal('reviewModal');

    // Réinitialisation de la vue de chat
    activeConv = null;
    localStorage.removeItem('activeConv');
    const header = $('chatHeader');
    const msgs = $('chatMessages');
    const bar = $('chatInputBar');
    const info = $('chatInfoSidebar');
    
    if (header) header.innerHTML = '<div class="text-sm font-bold text-gray-500">Sélectionnez une conversation</div>';
    if (msgs) msgs.innerHTML = '';
    if (bar) bar.classList.add('hidden');
    if (info) info.innerHTML = '<div class="text-center py-20 text-gray-400 text-xs font-bold">Détails de l\'objet</div>';
    
    notify('Prêt terminé.');
  } else {
    notify(status === 'accepted' ? 'Prêt accepté !' : status === 'rejected' ? 'Prêt refusé.' : 'Demande envoyée.');
  }
  
  await loadMessages();
};

/**
 * Gère la proposition d'un prêt en réponse à une demande.
 */
window.handleProposeLoan = async (demandItemId, otherUserId) => {
  const modal = $('proposeLoanModal');
  const form = $('proposeLoanForm');
  const select = $('propMyItemSelect');
  const newFields = $('newPropFields');
  if (!modal || !form || !select) return;

  const u = getUser();
  // Récupération de mes objets pour peupler la liste de sélection
  const myItems = await (await fetch(`${API}/items?owner_id=${u.id}`)).json().catch(() => []);
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
  
  const itemRes = await fetch(`${API}/items/${demandItemId}`);
  const item = await itemRes.json().catch(() => ({}));

  select.value = '';
  newFields.classList.remove('hidden');
  $('propItemName').value = item.name || '';
  $('propItemDesc').value = item.description || '';
  
  $('propFrom').value = item.available_from ? item.available_from.split('T')[0] : '';
  $('propUntil').value = item.available_until ? item.available_until.split('T')[0] : '';
  
  $('propItemName').required = true;
  $('propItemDesc').required = true;

  modal.classList.remove('hidden');

  form.onsubmit = async (e) => {
    e.preventDefault();
    let proposalItemId = select.value;
    let name = $('propItemName').value;
    let desc = $('propItemDesc').value;
    const sd = $('propFrom').value;
    const ed = $('propUntil').value;

    // Création d'un nouvel objet si aucun n'a été sélectionné dans la liste
    if (!proposalItemId) {
      const resNew = await fetch(`${API}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          category: 'Autre', 
          quality: 'good', 
          description: desc, 
          photo_url: '', 
          available_from: sd || null, 
          available_until: ed || null, 
          type: 'offer' 
        })
      });
      const newItem = await resNew.json();
      proposalItemId = newItem.id;
    } else {
      const opt = select.selectedOptions[0];
      name = opt.dataset.name;
      desc = opt.dataset.desc;
    }
    
    const res = await fetch(`${API}/items/${proposalItemId}/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lender_id: u.id, 
        borrower_id: otherUserId, 
        item_name: name, 
        item_desc: desc, 
        start_date: sd, 
        end_date: ed, 
        discussion_item_id: demandItemId 
      })
    });
    
    if (res.ok) {
      notify('Proposition envoyée !');
      modal.classList.add('hidden');
      form.reset();
      await loadMessages();
    } else {
      notify('Erreur lors de la proposition.', 'error');
    }
  };
};

/**
 * Affiche la modale de confirmation pour terminer une discussion.
 * @param {number} itemId - L'ID de l'objet.
 */
window.showEndModal = (itemId) => {
  const m = $('confirmEndModal');
  if (!m) return;
  m.classList.remove('hidden');
  
  $('endConfirmBtn').onclick = async () => {
    await fetch(`${API}/messages/end-discussion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        item_id: itemId, 
        user_id: getUser().id 
      })
    });
    
    m.classList.add('hidden');
    activeConv = null;
    localStorage.removeItem('activeConv');
    
    const header = $('chatHeader');
    const msgs = $('chatMessages');
    const bar = $('chatInputBar');
    
    if (header) header.innerHTML = '<div class="text-sm font-bold text-gray-500">Sélectionnez une conversation</div>';
    if (msgs) msgs.innerHTML = '';
    if (bar) bar.classList.add('hidden');
    
    loadMessages();
    notify('Discussion terminée');
  };
};

/**
 * Envoie une réponse textuelle dans la conversation active.
 */
window.sendReply = async () => {
  const bar = $('chatInputBar');
  const input = $('chatInput');
  if (!input.value.trim()) return;
  
  const u = getUser();
  const itemId = Number(bar.dataset.itemId);
  const otherId = Number(bar.dataset.other);
  
  await fetch(`${API}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      item_id: itemId, 
      sender_id: u.id, 
      receiver_id: otherId, 
      content: input.value 
    })
  });
  
  input.value = '';
  loadMessages();
};

/**
 * Initialise une nouvelle discussion depuis la page de détail d'un objet.
 * @param {number} itemId - L'ID de l'objet.
 * @param {number} ownerId - L'ID du propriétaire.
 */
window.initChat = async (itemId, ownerId) => {
  const msg = $('detailChatInput')?.value;
  const u = getUser();
  
  if (msg) {
    await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        item_id: itemId, 
        sender_id: u.id, 
        receiver_id: ownerId, 
        content: msg 
      })
    });
  } else {
    // Envoi d'un message par défaut si le champ est vide
    await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        item_id: itemId, 
        sender_id: u.id, 
        receiver_id: ownerId, 
        content: "👋 Bonjour !" 
      })
    });
  }
  
  activeConv = `${itemId}_${ownerId}`;
  navigate('/messages');
};

/**
 * Envoie une demande de prêt.
 * @param {number} itemId - L'ID de l'objet.
 */
window.requestLoan = async itemId => {
  const u = getUser();
  const from = $('loanFrom')?.value;
  const until = $('loanUntil')?.value;
  
  const res = await fetch(`${API}/items/${itemId}/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      borrower_id: u.id, 
      start_date: from || null, 
      end_date: until || null 
    })
  });
  
  if (res.ok) {
    notify('Demande de prêt envoyée !');
    navigate('/messages');
  } else {
    const err = await res.json().catch(() => ({}));
    notify(err.message || 'Erreur lors de la demande.', 'error');
  }
};

/**
 * Affiche la modale de demande de prêt dans le chat.
 */
window.requestLoanFromChat = async (itemId, other) => {
  const modal = $('loanRequestModal');
  const form = $('loanRequestForm');
  if (!modal || !form) return;
  
  modal.classList.remove('hidden');
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    const sd = $('chatLoanFrom').value || null;
    const ed = $('chatLoanUntil').value || null;
    const u = getUser();
    
    const res = await fetch(`${API}/items/${itemId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        borrower_id: u.id, 
        start_date: sd, 
        end_date: ed 
      })
    });
    
    if (res.ok) {
      notify('Demande de prêt envoyée !');
      modal.classList.add('hidden');
      form.reset();
      loadMessages();
    } else {
      const err = await res.json().catch(() => ({}));
      notify(err.message || 'Erreur lors de la demande.', 'error');
    }
  };
};

// =============================================================================
// --- GESTION DES PRÊTS (LOANS) ---
// =============================================================================

/**
 * Charge la liste des prêts de l'utilisateur pour la page dédiée.
 */
async function loadLoans() {
  const u = getUser();
  const res = await fetch(`${API}/loans/user/${u.id}`);
  const loans = await res.json().catch(() => []);
  const tableBody = $('loansTableBody');
  const cardList = $('loansCardList');
  
  if (loans.length === 0) {
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="py-20 text-center text-gray-300 text-xs font-bold uppercase tracking-widest">Aucune demande trouvée.</td></tr>';
    if (cardList) cardList.innerHTML = '<div class="text-center py-12 text-gray-400 text-sm font-bold">Aucune demande trouvée.</div>';
  } else {
    const rows = loans.map(t => loanRow(t, u.id));
    if (tableBody) tableBody.innerHTML = rows.map(r => r.tableRow).join('');
    if (cardList) cardList.innerHTML = rows.map(r => r.card).join('');
  }
    
  if (window.lucide) lucide.createIcons();
  
  const paginationText = $('paginationText');
  if (paginationText && loans.length > 0) paginationText.textContent = `${loans.length} prêt${loans.length > 1 ? 's' : ''}`;
}

/**
 * Action globale sur un prêt (accepter, refuser, etc.).
 * @param {number} id - L'ID de la transaction.
 * @param {string} status - Le nouveau statut.
 */
window.handleLoan = async (id, status) => {
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
  
  await fetch(`${API}/loans/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      status, 
      requester_id: getUser().id 
    })
  });
  
  notify(status === 'accepted' ? 'Prêt accepté !' : status === 'rejected' ? 'Prêt refusé.' : status === 'request_end' ? 'Demande envoyée.' : 'Prêt terminé.');
  loadLoans();
};

// =============================================================================
// --- BADGES DE NOTIFICATION ---
// =============================================================================

/**
 * Met à jour le compteur de messages non lus dans le menu de navigation.
 */
async function updateUnreadBadge() {
  if (!isLoggedIn()) return;
  try {
    const u = getUser();
    const res = await fetch(`${API}/messages/${u.id}`);
    const msgs = await res.json().catch(() => []);
    const unread = msgs.filter(m => !m.is_read && m.receiver_id === u.id).length;
    
    const badge = $('unreadBadge');
    if (badge) {
      badge.textContent = unread;
      badge.classList.toggle('hidden', !unread);
    }
    
    const badgeMobile = $('unreadBadgeMobile');
    if (badgeMobile) {
      badgeMobile.textContent = unread;
      badgeMobile.classList.toggle('hidden', !unread);
    }
  } catch {}
}

// =============================================================================
// --- PANNEAU D'ADMINISTRATION ---
// =============================================================================

window.setAdminTab = (tab) => {
  document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.remove('border-emerald-600', 'text-emerald-600');
    btn.classList.add('border-transparent', 'text-gray-400');
  });
  
  $(`adminSec-${tab}`)?.classList.remove('hidden');
  const activeBtn = $(`tabBtn-${tab}`);
  if (activeBtn) {
    activeBtn.classList.remove('border-transparent', 'text-gray-400');
    activeBtn.classList.add('border-emerald-600', 'text-emerald-600');
  }
};

window.loadAdminData = async () => {
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // 1. Charger Utilisateurs
  try {
    const uRes = await fetch(`${API}/admin/users`, { headers });
    if (uRes.status === 200) {
      const users = await uRes.json();
      const uTable = $('adminUsersTable');
      if (uTable) {
        uTable.innerHTML = users.map(u => `
          <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="py-4 px-6 font-bold text-gray-900">${u.name}</td>
            <td class="py-4 px-6 font-medium text-gray-500">${u.email}</td>
            <td class="py-4 px-6 text-emerald-700 font-bold">${u.phone || 'Non renseigné'}</td>
            <td class="py-4 px-6 text-gray-500">${u.school} (${u.status})</td>
            <td class="py-4 px-6">
              <span class="${u.is_admin ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'} text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                ${u.is_admin ? 'Admin' : 'Membre'}
              </span>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (e) {
    console.error("Erreur chargement utilisateurs admin:", e);
  }

  // 2. Charger Transactions
  try {
    const tRes = await fetch(`${API}/admin/transactions`, { headers });
    if (tRes.status === 200) {
      const txs = await tRes.json();
      const tTable = $('adminTxsTable');
      if (tTable) {
        tTable.innerHTML = txs.map(t => `
          <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="py-4 px-6 text-gray-400 font-bold">#${t.id}</td>
            <td class="py-4 px-6 font-bold text-gray-900">${t.item_name}</td>
            <td class="py-4 px-6 text-gray-600 font-semibold">${t.owner_name}</td>
            <td class="py-4 px-6 text-gray-600 font-semibold">${t.borrower_name}</td>
            <td class="py-4 px-6 text-gray-500 text-xs font-bold">${fmtDate(t.start_date)} au ${fmtDate(t.end_date)}</td>
            <td class="py-4 px-6">
              <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                t.status === 'completed' ? 'bg-gray-200 text-gray-600' :
                t.status === 'ongoing' ? 'bg-orange-100 text-orange-800' :
                t.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }">${t.status}</span>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (e) {
    console.error("Erreur chargement transactions admin:", e);
  }

  // 3. Charger Messages
  try {
    const mRes = await fetch(`${API}/admin/messages`, { headers });
    if (mRes.status === 200) {
      const msgs = await mRes.json();
      const mTable = $('adminMsgsTable');
      if (mTable) {
        mTable.innerHTML = msgs.map(m => `
          <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="py-4 px-6 font-bold text-gray-900">${m.item_name}</td>
            <td class="py-4 px-6 text-gray-600 font-semibold">${m.sender_name}</td>
            <td class="py-4 px-6 text-gray-600 font-semibold">${m.receiver_name}</td>
            <td class="py-4 px-6 text-gray-500 text-sm italic font-medium break-all max-w-xs">${m.content}</td>
            <td class="py-4 px-6 text-gray-400 text-xs font-bold">${fmtDate(m.created_at)}</td>
          </tr>
        `).join('');
      }
    }
  } catch (e) {
    console.error("Erreur chargement messages admin:", e);
  }
  
  if (window.lucide) lucide.createIcons();
};

// =============================================================================
// --- INITIALISATION ---
// =============================================================================

if (isLoggedIn()) {
  initWS();
  hdr();
}

handleRoute();

// Rafraîchissement périodique du badge de messages non lus
setInterval(updateUnreadBadge, 30000);
