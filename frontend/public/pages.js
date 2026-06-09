/**
 * @file pages.js
 * @description Templates HTML pour les différentes pages et composants de l'application PolyEarth.
 * Utilise des fonctions retournant des chaînes de caractères (template literals).
 */

import { catIcon, catBadge, qBadge, stars, dispoBadge, fmtDate, getUser } from './lib.js';

// =============================================================================
// --- UTILITAIRES DE RENDU (HELPERS) ---
// =============================================================================

/**
 * Génère le badge HTML correspondant au statut d'une transaction.
 * @param {string} status - Le statut de la transaction (pending, accepted, etc.).
 * @returns {string} Le HTML du badge.
 */
const getStatusBadge = (status) => {
    const configs = {
        'pending': { label: 'Demandé', cls: 'bg-blue-500 text-white' },
        'accepted': { label: 'Accepté', cls: 'bg-emerald-500 text-white' },
        'ongoing': { label: 'En cours', cls: 'bg-orange-500 text-white' },
        'cancelled': { label: 'Annulé', cls: 'bg-gray-700 text-white' },
        'return_requested': { label: 'Retour demandé', cls: 'bg-blue-300 text-white' },
        'rejected': { label: 'Refusé', cls: 'bg-red-500 text-white' },
        'dispute': { label: 'Litige', cls: 'bg-purple-500 text-white' },
        'completed': { label: 'Terminé', cls: 'bg-gray-200 text-gray-600' }
    };
    const c = configs[status] || configs['pending'];
    return `<span class="${c.cls} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-center block w-28 mx-auto">${c.label}</span>`;
};

// =============================================================================
// --- PAGES PRINCIPALES ---
// =============================================================================

/**
 * Page d'accueil : affiche le bandeau de recherche, les stats et le catalogue.
 * @returns {string} HTML de la page.
 */
export const homePage = () => {
    const user = getUser();
    return `
    <div class="space-y-12 animate-fade-in pb-20">
        <!-- Bannière Hero avec effet Glassmorphism -->
        <div class="relative rounded-4xl p-12 overflow-hidden bg-white/10 backdrop-blur-3xl border-2 border-white shadow-2xl shadow-duck/10">
            <div class="relative z-10 max-w-2xl">
                <h2 class="text-4xl font-black text-duck mb-2 tracking-tight">Salut, ${user.name?.split(' ')[0] || 'Hugo'} 👋</h2>
                <p class="text-gray-500 font-medium mb-8 text-lg">Que souhaites-tu emprunter aujourd'hui ?</p>
                
                <div class="relative group">
                    <input id="searchInput" type="text" placeholder="Rechercher un objet (ex: Perceuse, Tente...)" 
                        class="w-full pl-14 pr-4 py-5 bg-white/40 backdrop-blur-xl shadow-xl shadow-duck/5 rounded-2xl outline-none border-2 border-transparent focus:border-duck transition-all font-semibold text-gray-700 placeholder-gray-400">
                    <i data-lucide="search" class="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-duck transition-colors"></i>
                    <button onclick="doSearch()" class="absolute right-3 top-3 bottom-3 bg-duck text-white px-8 rounded-lg font-bold hover:bg-duck-dark transition-all shadow-lg shadow-duck/20">
                        Rechercher
                    </button>
                </div>
            </div>
            <!-- Formes décoratives en arrière-plan -->
            <div class="absolute -right-10 -top-10 w-80 h-80 bg-duck/20 rounded-full blur-3xl"></div>
            <div class="absolute right-40 bottom-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
            <div class="absolute left-1/2 top-0 w-48 h-48 bg-pastel-green rounded-full blur-3xl opacity-60"></div>
        </div>

        <!-- Tableau de bord des statistiques -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div onclick="navigate('/offres')" class="bg-pastel-green p-8 rounded-3xl border border-duck/5 flex items-center justify-between group hover:scale-[1.02] transition-transform cursor-pointer">
                <div>
                    <p class="text-duck font-bold uppercase tracking-widest text-[10px] mb-1">Objets disponibles</p>
                    <h3 id="statsAvailable" class="text-4xl font-black text-duck">...</h3>
                </div>
                <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-duck shadow-sm group-hover:rotate-12 transition-transform">
                    <i data-lucide="package" class="w-7 h-7"></i>
                </div>
            </div>
            <div onclick="navigate('/prets')" class="bg-pastel-green p-8 rounded-3xl border border-duck/5 flex items-center justify-between group hover:scale-[1.02] transition-transform cursor-pointer">
                <div>
                    <p class="text-duck font-bold uppercase tracking-widest text-[10px] mb-1">Prêts en cours</p>
                    <h3 id="statsOngoing" class="text-4xl font-black text-duck">...</h3>
                </div>
                <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-duck shadow-sm group-hover:rotate-12 transition-transform">
                    <i data-lucide="refresh-cw" class="w-7 h-7"></i>
                </div>
            </div>
        </div>

        <!-- Contrôles du catalogue -->
        <div class="space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-8">
                    <h2 class="text-3xl font-black text-gray-900 tracking-tight">Catalogue</h2>
                    <nav class="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        <button class="px-6 py-2 rounded-lg text-sm font-bold bg-white text-duck shadow-sm">Catalogue</button>
                        <button onclick="navigate('/prets')" class="px-6 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Mes prêts</button>
                    </nav>
                </div>
                <div class="flex items-center gap-3">
                    <div class="relative hidden sm:block">
                        <input type="text" placeholder="Filtrer..." class="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:bg-white focus:border-duck transition-all text-sm font-medium">
                        <i data-lucide="filter" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                    <button onclick="showModal('modal')" class="bg-duck text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-duck-dark transition-all shadow-md shadow-duck/10">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        Ajouter un objet
                    </button>
                </div>
            </div>

            <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <select class="appearance-none bg-gray-50 border border-gray-100 px-6 py-2.5 rounded-full text-sm font-bold text-gray-500 outline-none focus:border-duck cursor-pointer">
                    <option>Catégorie</option>
                    <option>Matériel</option>
                    <option>Sport</option>
                    <option>Livres</option>
                </select>
                <select class="appearance-none bg-gray-50 border border-gray-100 px-6 py-2.5 rounded-full text-sm font-bold text-gray-500 outline-none focus:border-duck cursor-pointer">
                    <option>État</option>
                    <option>Comme neuf</option>
                    <option>Bon état</option>
                </select>
            </div>
        </div>

        <div id="offersGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div class="col-span-full text-center py-20 text-gray-300">
                <div class="animate-spin w-10 h-10 border-4 border-duck border-t-transparent rounded-full mx-auto mb-4"></div>
                <p class="font-bold">Chargement du catalogue...</p>
            </div>
        </div>
    </div>
    `;
};

/**
 * Page de suivi des prêts : liste les demandes envoyées et reçues.
 * @returns {string} HTML de la page.
 */
export const pretsPage = () => `
    <div class="space-y-8 animate-fade-in pb-20">
        <!-- Barre d'outils supérieure -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div class="space-y-1">
                <h1 class="text-4xl font-black text-gray-900 tracking-tight">Suivi des prêts</h1>
                <p class="text-gray-400 font-medium">Demandes envoyées et reçues</p>
            </div>
            
            <div class="flex flex-wrap items-center gap-3">
                <div class="relative">
                    <input type="text" placeholder="Rechercher..." class="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-full outline-none focus:bg-white focus:border-duck transition-all text-sm font-medium w-64">
                    <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
                <button onclick="navigate('/offres')" class="bg-duck text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-duck-dark transition-all shadow-lg shadow-duck/10">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Demander un prêt
                </button>
            </div>
        </div>

        <!-- Zone de filtrage rapide -->
        <div class="flex gap-3">
            <button class="bg-white border border-gray-100 px-5 py-2 rounded-full text-xs font-bold text-gray-500 flex items-center gap-2 hover:border-duck transition-colors">
                Statut <i data-lucide="chevron-down" class="w-3 h-3"></i>
            </button>
            <button class="bg-white border border-gray-100 px-5 py-2 rounded-full text-xs font-bold text-gray-500 flex items-center gap-2 hover:border-duck transition-colors">
                Objet <i data-lucide="chevron-down" class="w-3 h-3"></i>
            </button>
        </div>

        <!-- Conteneur du tableau des transactions -->
        <div class="relative bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-pastel-green text-duck text-[11px] font-black uppercase tracking-widest">
                            <th class="py-5 px-6"><div class="flex items-center gap-2"><i data-lucide="filter" class="w-3.5 h-3.5 text-gray-400"></i> Demande #</div></th>
                            <th class="py-5 px-6"><div class="flex items-center gap-2"><i data-lucide="image" class="w-3.5 h-3.5 text-gray-400"></i> Aperçu</div></th>
                            <th class="py-5 px-6"><div class="flex items-center gap-2"><i data-lucide="tag" class="w-3.5 h-3.5 text-gray-400"></i> Statut</div></th>
                            <th class="py-5 px-6"><div class="flex items-center gap-2"><i data-lucide="package" class="w-3.5 h-3.5 text-gray-400"></i> Objet</div></th>
                            <th class="py-5 px-6"><div class="flex items-center gap-2"><i data-lucide="user" class="w-3.5 h-3.5 text-gray-400"></i> Interlocuteur</div></th>
                            <th class="py-5 px-6 border-b-2 border-duck/10"><div class="flex items-center gap-2">Date <i data-lucide="arrow-down" class="w-3.5 h-3.5"></i></div></th>
                            <th class="py-5 px-6"><div class="flex items-center gap-2"><i data-lucide="calendar" class="w-3.5 h-3.5 text-gray-400"></i> Début</div></th>
                        </tr>
                    </thead>
                    <tbody id="loansTableBody" class="divide-y divide-gray-50 text-sm font-medium text-gray-600">
                        <tr><td colspan="7" class="py-20 text-center text-gray-300">Chargement...</td></tr>
                    </tbody>
                </table>
            </div>
            <!-- Barre de pagination -->
            <div class="p-6 bg-gray-50/50 flex justify-end items-center border-t border-gray-100">
                <span id="paginationText" class="text-xs font-bold text-gray-400 uppercase tracking-widest">...</span>
            </div>
        </div>
    </div>
`;

/**
 * Génère une ligne (tr) pour le tableau de suivi des prêts.
 * @param {Object} t - Les données de la transaction.
 * @param {number} uid - ID de l'utilisateur connecté.
 * @returns {string} HTML de la ligne.
 */
export const loanRow = (t, uid) => {
    const isOwner = t.owner_id === uid;
    const otherId = isOwner ? t.borrower_id : t.owner_id;
    const borrowerEmail = t.borrower_email || 'etu.polytech@umontpellier.fr';
    const ownerEmail = t.owner_email || 'etu.polytech@umontpellier.fr';
    const otherPhoto = isOwner ? t.borrower_photo : t.owner_photo;
    const otherName = isOwner ? t.borrower_name : t.owner_name;
    return `
        <tr class="hover:bg-gray-50/50 transition-colors group cursor-pointer" onclick="navigate('/messages')">
            <td class="py-4 px-6 font-black text-gray-400 text-xs">#${t.id.toString().padStart(4, '0')}</td>
            <td class="py-4 px-6">
                <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-50">
                    ${t.item_photo ? `<img src="${t.item_photo}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-gray-300"><i data-lucide="package" class="w-5 h-5"></i></div>`}
                </div>
            </td>
            <td class="py-4 px-6">${getStatusBadge(t.status)}</td>
            <td class="py-4 px-6 font-bold text-gray-900">${t.item_name}</td>
            <td class="py-4 px-6">
                <div class="flex items-center gap-2 hover:opacity-70 transition-opacity" onclick="event.stopPropagation();navigate('/profile/${otherId}')">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-duck/10 flex-shrink-0">
                        ${otherPhoto ? `<img src="${otherPhoto}" class="w-full h-full object-cover">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=00635d&color=fff" class="w-full h-full object-cover">`}
                    </div>
                    <div class="flex flex-col">
                        <span class="text-gray-900 font-bold">${otherName}</span>
                        <span class="text-[10px] text-gray-400 truncate w-32" title="${isOwner ? borrowerEmail : ownerEmail}">${isOwner ? borrowerEmail : ownerEmail}</span>
                    </div>
                </div>
            </td>
            <td class="py-4 px-6 text-gray-400">${fmtDate(t.created_at || new Date())}</td>
            <td class="py-4 px-6 text-duck font-bold">${fmtDate(t.start_date)}</td>
        </tr>
    `;
};

/**
 * Page de liste des offres de prêt.
 * @returns {string} HTML de la page.
 */
export const offresPage = () => `
    <div class="flex flex-col lg:flex-row gap-8">
        <aside class="w-full lg:w-64 space-y-4">
            <button onclick="showModal('modal')" class="w-full bg-duck text-white p-4 rounded-lg font-black hover:bg-duck-dark shadow-lg shadow-duck/10 transition-all flex items-center justify-center gap-2">
                <span>➕ Publier une offre</span>
            </button>
            <div class="bg-white p-6 rounded-xl border border-gray-100">
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Catégories</h4>
                <div class="space-y-2">
                    ${['all', 'Matériel', 'Livres', 'Services', 'Sport', 'Autre'].map(c => `
                        <button onclick="filterCat('${c}')" data-cat="${c}" class="cat-pill w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-all ${c === 'all' ? 'active' : ''}">
                            ${c === 'all' ? '📦 Toutes' : `${catIcon(c)} ${c}`}
                        </button>
                    `).join('')}
                </div>
            </div>
        </aside>
        <main class="flex-1">
            <h2 class="text-3xl font-black text-gray-900 mb-8">Objets disponibles</h2>
            <div id="offersGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </main>
    </div>
`;

/**
 * Page de liste des demandes d'objets.
 * @returns {string} HTML de la page.
 */
export const demandesPage = () => `
    <div class="space-y-8 animate-fade-in pb-20">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div class="space-y-1">
                <h1 class="text-4xl font-black text-gray-900 tracking-tight">Ils recherchent...</h1>
                <p class="text-gray-400 font-medium">Aidez d'autres étudiants en leur prêtant ce dont ils ont besoin</p>
            </div>
            <button onclick="showModal('modal')" class="bg-duck text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-duck-dark transition-all shadow-xl shadow-duck/20">
                <i data-lucide="search" class="w-5 h-5"></i>
                Publier une demande
            </button>
        </div>

        <div class="flex flex-col lg:flex-row gap-8">
            <aside class="w-full lg:w-64 space-y-4">
                <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Catégories</h4>
                    <div class="space-y-2">
                        ${['all', 'Matériel', 'Livres', 'Services', 'Sport', 'Autre'].map(c => `
                            <button onclick="filterCat('${c}')" data-cat="${c}" class="cat-pill w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${c === 'all' ? 'active' : ''}">
                                ${c === 'all' ? '📦 Toutes' : `${catIcon(c)} ${c}`}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </aside>
            <main class="flex-1">
                <div id="demandsGrid" class="flex flex-col gap-4"></div>
            </main>
        </div>
    </div>
`;

/**
 * Composant Carte pour une demande d'objet.
 * @param {Object} i - Les données de l'objet (demande).
 * @returns {string} HTML de la carte.
 */
export const demandCard = (i) => `
    <div onclick="navigate('/item/${i.id}')" class="bg-white p-6 rounded-3xl border border-gray-100 hover:border-duck/20 hover:shadow-xl hover:shadow-duck/5 transition-all cursor-pointer group">
        <div class="flex flex-col md:flex-row md:items-center gap-6">
            <div class="flex-1 space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        ${catBadge(i.category)}
                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mis en ligne le ${fmtDate(i.created_at)}</span>
                    </div>
                </div>
                <h3 class="text-2xl font-black text-gray-900 group-hover:text-duck transition-colors">${i.name}</h3>
                <p class="text-gray-500 font-medium line-clamp-2 text-sm">${i.description || 'Pas de description.'}</p>
                <div class="flex flex-wrap items-center gap-6 pt-2">
                    <div class="flex items-center gap-2" onclick="event.stopPropagation();navigate('/profile/${i.owner_id}')">
                        <div class="w-8 h-8 rounded-full overflow-hidden bg-duck/10 border border-white shadow-sm">
                            ${i.owner_photo ? `<img src="${i.owner_photo}" class="w-full h-full object-cover">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(i.owner_name)}&background=00635d&color=fff" class="w-full h-full object-cover">`}
                        </div>
                        <span class="text-sm font-bold text-gray-900 hover:text-duck transition-colors">${i.owner_name}</span>
                    </div>
                    <div class="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <i data-lucide="calendar" class="w-4 h-4 text-duck"></i>
                        <span class="text-xs font-bold">Besoin pour le : <span class="text-gray-900">${fmtDate(i.available_from) || 'À convenir'}</span></span>
                    </div>
                </div>
            </div>
            <div class="md:w-32 flex-shrink-0">
                <button class="w-full bg-duck text-white py-2.5 rounded-xl font-black shadow-lg shadow-duck/10 hover:bg-duck-dark transition-all text-sm">
                    Proposer
                </button>
            </div>
        </div>
    </div>
`;

/**
 * Page de messagerie (interface de discussion).
 * @returns {string} HTML de la page.
 */
export const messagesPage = () => `
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden flex h-[70vh] shadow-sm">
        <!-- Barre latérale des conversations -->
        <div class="w-full md:w-80 border-r border-gray-50 flex flex-col conv-sidebar">
            <div class="p-6 border-b border-gray-50"><h3 class="text-xl font-black text-gray-900">Messages</h3></div>
            <div id="convList" class="flex-1 overflow-y-auto"></div>
        </div>
        <!-- Panneau de discussion actif -->
        <div id="chatPanel" class="flex-1 flex flex-col hidden-mobile bg-gray-50/30">
            <div id="chatHeader" class="p-4 border-b border-gray-50 bg-white flex items-center">
                <div class="text-sm font-bold text-gray-400">Sélectionnez une discussion</div>
            </div>
            <div id="chatMessages" class="flex-1 overflow-y-auto p-6 space-y-4"></div>
            <!-- Zone de saisie -->
            <div id="chatInputBar" class="p-4 bg-white border-t border-gray-50 hidden">
                <div class="flex gap-2">
                    <button id="toggleLoanBtn" onclick="toggleLoanForm()" class="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg font-bold text-xs hover:bg-100 transition-all">📅 Prêt</button>
                    <input id="chatInput" placeholder="Écrire un message..." class="flex-1 bg-gray-50 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-duck transition-all outline-none">
                    <button onclick="sendReply()" class="p-2 bg-duck text-white rounded-lg hover:bg-duck-dark transition-all"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button>
                </div>
                <!-- Formulaire contextuel de prêt -->
                <div id="chatLoanFormContainer" class="hidden mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-slide-in">
                    <div class="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">Détails du prêt</div>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <input id="chatLoanFrom" type="date" class="p-2 rounded-lg border-none text-xs font-bold">
                        <input id="chatLoanUntil" type="date" class="p-2 rounded-lg border-none text-xs font-bold">
                    </div>
                    <button onclick="sendLoanRequestFromChat()" class="w-full bg-duck text-white py-2 rounded-lg text-xs font-black shadow-lg shadow-duck/10 hover:bg-duck-dark">Envoyer la demande</button>
                </div>
            </div>
        </div>
        <!-- Barre latérale d'infos objet -->
        <div id="chatInfoSidebar" class="w-64 border-l border-gray-50 bg-white p-6 hidden lg:flex flex-col">
            <div class="text-center py-20 text-gray-300 text-xs font-bold">Détails de l'objet</div>
        </div>
    </div>
`;

/**
 * Page de profil utilisateur (mon profil).
 * @param {Object} u - Les données de l'utilisateur.
 * @returns {string} HTML de la page.
 */
export const profilPage = (u) => `
    <div class="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <!-- En-tête du profil -->
        <div class="bg-white rounded-xl p-10 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-10 items-center">
            <div class="w-32 h-32 bg-duck rounded-full flex items-center justify-center text-5xl font-black text-white shadow-inner overflow-hidden border-4 border-white shadow-duck/10">
                ${u.photo_url ? `<img src="${u.photo_url}" class="w-full h-full object-cover">` : u.name?.charAt(0)}
            </div>
            <div class="flex-1 text-center md:text-left">
                <div class="flex flex-col md:flex-row md:items-center gap-4 mb-2 justify-center md:justify-start">
                    <h2 class="text-4xl font-black text-gray-900">${u.name}</h2>
                    <div class="bg-duck/10 text-duck px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">${u.transaction_count || 0} échanges</div>
                </div>
                <p class="text-gray-400 font-bold mb-4 italic">${u.status || 'Étudiant'} @ ${u.school || 'Polytech Montpellier'}</p>
                
                <div class="flex items-center gap-3 mb-6 justify-center md:justify-start">
                    <span class="text-2xl font-black text-gray-900">${Number(u.rating || 0).toFixed(1)}</span>
                    <div class="flex flex-col">
                        ${stars(u.rating, u.transaction_count)}
                        <span class="text-[10px] text-gray-400 font-bold">Ma note globale</span>
                    </div>
                </div>

                <div class="flex justify-center md:justify-start gap-4">
                    <button onclick="$('editProfileSection').classList.toggle('hidden')" class="bg-gray-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-900 transition-all shadow-lg">Éditer mon profil</button>
                    <button onclick="doLogout()" class="text-red-500 font-bold px-8 py-3 rounded-lg border border-red-50 hover:bg-red-50 transition-all">Déconnexion</button>
                </div>
            </div>
        </div>

        <!-- Section d'édition (masquée par défaut) -->
        <div id="editProfileSection" class="hidden bg-pastel-green p-8 rounded-xl border border-duck/5 animate-slide-in">
            <h3 class="text-xl font-black text-duck mb-6">Modifier mes informations</h3>
            <form onsubmit="updateProfile(event)" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-duck uppercase tracking-widest ml-1">Nom complet</label>
                        <input id="editName" value="${u.name}" class="w-full p-4 bg-white border-none rounded-lg outline-none font-bold text-sm">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-duck uppercase tracking-widest ml-1">Statut</label>
                        <select id="editStatus" class="w-full p-4 bg-white border-none rounded-lg outline-none font-bold text-sm">
                            <option value="Étudiant" ${u.status === 'Étudiant' ? 'selected' : ''}>Étudiant</option>
                            <option value="Personnel" ${u.status === 'Personnel' ? 'selected' : ''}>Personnel</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-duck uppercase tracking-widest ml-1">École / Spécialité</label>
                        <input id="editSchool" value="${u.school || ''}" placeholder="Ex: Polytech - Informatique" class="w-full p-4 bg-white border-none rounded-lg outline-none font-bold text-sm">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-duck uppercase tracking-widest ml-1">Photo de profil</label>
                        <input id="editPhoto" type="file" accept="image/*" class="w-full p-3 bg-white rounded-lg text-xs font-bold text-gray-400">
                    </div>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="submit" class="bg-duck text-white px-8 py-3 rounded-lg font-black shadow-lg shadow-duck/10 hover:bg-duck-dark transition-all">Enregistrer</button>
                    <button type="button" onclick="$('editProfileSection').classList.add('hidden')" class="text-gray-500 font-bold px-8 py-3">Annuler</button>
                </div>
            </form>
        </div>

        <div>
            <h3 class="text-2xl font-black text-gray-900 mb-6">Mes offres de prêt</h3>
            <div id="myOffersGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
        </div>

        <div>
            <h3 class="text-2xl font-black text-gray-900 mb-6">Mes demandes</h3>
            <div id="myDemandsGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
        </div>
    </div>
`;

/**
 * Page de profil public d'un autre utilisateur.
 * @param {Object} u - Les données de l'utilisateur.
 * @param {Array} items - La liste des objets appartenant à cet utilisateur.
 * @returns {string} HTML de la page.
 */
export const userProfilePage = (u, items) => {
    const offers = items.filter(i => i.type === 'offer');
    const demands = items.filter(i => i.type === 'demand');
    
    return `
    <div class="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
        <div class="bg-white rounded-4xl p-12 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row gap-12 items-center relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-duck/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div class="w-40 h-40 bg-duck rounded-full flex items-center justify-center text-6xl font-black text-white shadow-2xl overflow-hidden border-8 border-white relative z-10 flex-shrink-0">
                ${u.photo_url ? `<img src="${u.photo_url}" class="w-full h-full object-cover">` : u.name?.charAt(0)}
            </div>
            <div class="flex-1 text-center md:text-left relative z-10">
                <div class="flex flex-col md:flex-row md:items-center gap-4 mb-4 justify-center md:justify-start">
                    <h2 class="text-5xl font-black text-gray-900 tracking-tighter">${u.name}</h2>
                    <div class="bg-duck/10 text-duck px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">${u.transaction_count || 0} échanges</div>
                </div>
                <p class="text-gray-400 font-bold mb-8 text-lg italic">${u.status || 'Étudiant'} @ ${u.school || 'Polytech Montpellier'}</p>
                
                <div class="flex flex-wrap gap-10 justify-center md:justify-start">
                    <div>
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Note globale</div>
                        <div class="flex items-center gap-3">
                            <span class="text-3xl font-black text-gray-900">${Number(u.rating || 0).toFixed(1)}</span>
                            <div class="flex flex-col">
                                ${stars(u.rating, u.transaction_count)}
                                <span class="text-[10px] text-gray-400 font-bold">Moyenne pondérée</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="space-y-8">
            <h3 class="text-3xl font-black text-gray-900 tracking-tight">Objets proposés par ${u.name.split(' ')[0]}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                ${offers.length ? offers.map(i => itemCard(i)).join('') : '<div class="col-span-full py-12 text-center bg-gray-50 rounded-3xl text-gray-400 font-bold">Aucune offre pour le moment.</div>'}
            </div>
        </div>

        <div class="space-y-8">
            <h3 class="text-3xl font-black text-gray-900 tracking-tight">Demandes de ${u.name.split(' ')[0]}</h3>
            <div class="grid grid-cols-1 gap-4">
                ${demands.length ? demands.map(i => demandCard(i)).join('') : '<div class="col-span-full py-12 text-center bg-gray-50 rounded-3xl text-gray-400 font-bold">Aucune demande pour le moment.</div>'}
            </div>
        </div>
    </div>
`;
};

/**
 * Composant Carte pour une offre d'objet.
 * @param {Object} i - Les données de l'objet (offre).
 * @returns {string} HTML de la carte.
 */
export const itemCard = (i) => `
    <div onclick="navigate('/item/${i.id}')" class="group cursor-pointer">
        <div class="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100 mb-4 shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
            ${i.photo_url ? 
                `<img src="${i.photo_url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">` : 
                `<div class="w-full h-full flex items-center justify-center text-7xl bg-pastel-green/30 text-duck/20">
                    <i data-lucide="package" class="w-20 h-20"></i>
                </div>`
            }
            <div class="absolute top-4 left-4">
                <span class="bg-white/90 backdrop-blur-md text-duck text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                    ${i.category || 'Matériel'}
                </span>
            </div>
        </div>
        <div class="bg-pastel-green p-5 rounded-3xl border border-duck/5 transition-transform group-hover:scale-[1.01]">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-gray-900 text-lg group-hover:text-duck transition-colors truncate">${i.name}</h4>
                <span class="text-duck font-black text-xs mt-1">Gratuit</span>
            </div>
            <div class="flex items-center gap-2" onclick="event.stopPropagation();navigate('/profile/${i.owner_id}')">
                <div class="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden border border-duck/10">
                    ${i.owner_photo ? `<img src="${i.owner_photo}" class="w-full h-full object-cover">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(i.owner_name || 'U')}&background=eee&color=999" class="w-full h-full object-cover">`}
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] font-bold text-gray-900 leading-none">${i.owner_name || 'Anonyme'}</span>
                    ${stars(i.owner_rating, i.owner_transaction_count)}
                </div>
            </div>
        </div>
    </div>
`;

/**
 * Page de détail d'un objet.
 * @param {Object} i - Les données de l'objet.
 * @param {boolean} isOwner - Si l'utilisateur connecté est le propriétaire.
 * @returns {string} HTML de la page.
 */
export const itemDetail = (i, isOwner) => `
    <div class="max-w-6xl mx-auto animate-fade-in pb-20">
        <button onclick="navigate('/')" class="mb-8 flex items-center gap-2 text-gray-400 hover:text-duck font-bold transition-all">← Retour</button>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <!-- Image de l'objet -->
            <div class="bg-white rounded-3xl overflow-hidden border border-gray-100 aspect-square relative shadow-sm">
                ${i.photo_url ? `<img src="${i.photo_url}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-[10rem]">${catIcon(i.category)}</div>`}
            </div>
            <!-- Informations et discussion -->
            <div class="space-y-8">
                <div>
                    <div class="flex gap-2 mb-4">${catBadge(i.category)} ${qBadge(i.quality)}</div>
                    <h2 class="text-5xl font-black text-gray-900 mb-2 tracking-tight">${i.name}</h2>
                    <div class="text-duck font-black text-xl tracking-widest uppercase">Prêt Gratuit</div>
                </div>
                <div class="p-8 bg-white rounded-2xl border border-gray-100 space-y-4 shadow-sm">
                    <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Description</h3>
                    <p class="text-gray-600 font-medium leading-relaxed">${i.description || 'Pas de description.'}</p>
                </div>
                <div class="p-8 bg-pastel-green rounded-3xl border border-duck/5 space-y-6 shadow-sm">
                    <!-- Infos Propriétaire -->
                    <div class="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onclick="navigate('/profile/${i.owner_id}')">
                        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl overflow-hidden border border-duck/10">
                            ${i.owner_photo ? `<img src="${i.owner_photo}" class="w-full h-full object-cover">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(i.owner_name || 'U')}&background=eee&color=999" class="w-full h-full object-cover">`}
                        </div>
                        <div>
                            <div class="font-bold text-gray-900">${i.owner_name}</div>
                            ${stars(i.owner_rating, i.owner_transaction_count)}
                        </div>
                    </div>
                    <!-- Zone de contact rapide -->
                    ${isOwner ? '' : `
                    <div class="space-y-3 pt-4 border-t border-duck/10">
                        <textarea id="detailChatInput" placeholder="Bonjour ! J'aimerais beaucoup t'emprunter ton objet..." class="w-full bg-white border-none rounded-xl p-4 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-duck outline-none h-24 transition-all shadow-inner"></textarea>
                        <button onclick="initChat(${i.id},${i.owner_id})" class="w-full bg-duck text-white py-4 rounded-lg font-black hover:bg-duck-dark transition-all shadow-lg shadow-duck/20">Lancer la discussion</button>
                    </div>`}
                </div>
            </div>
        </div>
    </div>
`;

/**
 * Page de connexion.
 * @returns {string} HTML de la page.
 */
export const loginPage = () => `
    <div class="max-w-md mx-auto bg-white p-10 rounded-xl shadow-sm border border-gray-100 mt-10">
        <h2 class="text-3xl font-black mb-10 text-center text-gray-900 tracking-tight">Bonjour ! 🌱</h2>
        <form onsubmit="doLogin(event)" class="space-y-6">
            <input id="email" type="email" placeholder="Adresse e-mail" class="w-full p-4 bg-gray-50 border-none rounded-lg outline-none font-bold" required>
            <input id="password" type="password" placeholder="Mot de passe" class="w-full p-4 bg-gray-50 border-none rounded-lg outline-none font-bold" required>
            <button type="submit" class="w-full bg-duck text-white py-4 rounded-lg font-black shadow-lg shadow-duck/10 hover:bg-duck-dark transition-all">Se connecter</button>
        </form>
        <div class="mt-8 text-center">
            <p class="text-sm text-gray-400 font-medium mb-2">Pas encore de compte ?</p>
            <button onclick="navigate('/register')" class="text-duck font-black text-sm hover:underline transition-all">Créer un compte</button>
        </div>
    </div>
`;

/**
 * Page d'inscription.
 * @returns {string} HTML de la page.
 */
export const registerPage = () => `
<div id="registerWizard" class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
  <div class="w-full max-w-lg">
    <div class="mb-8">
      <div class="flex justify-between items-center mb-2">
        <span id="wizardStepLabel" class="text-xs font-black text-emerald-600 uppercase tracking-widest">Étape 1 / 6</span>
        <span id="wizardPercent" class="text-xs font-black text-gray-400">0%</span>
      </div>
      <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div id="wizardProgress" class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style="width:0%"></div>
      </div>
    </div>

    <div class="bg-white rounded-3xl shadow-xl shadow-emerald-100/50 border border-emerald-50 overflow-hidden">

      <!-- Étape 1 : Compte -->
      <div id="wStep1" class="wizard-step p-8 md:p-10">
        <div class="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl mb-6">🌱</div>
        <h2 class="text-2xl font-black text-gray-900 mb-1 tracking-tight">Créer mon compte</h2>
        <p class="text-sm text-gray-400 font-medium mb-8">Rejoins la communauté PolyEarth !</p>
        <form onsubmit="wizardNext(event)" class="space-y-4">
          <input id="regName" placeholder="Prénom et Nom" class="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-800 focus:border-emerald-300 transition-all" required>
          <input id="regEmail" type="email" placeholder="Adresse e-mail" class="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-800 focus:border-emerald-300 transition-all" required>
          <input id="regPassword" type="password" placeholder="Mot de passe (8 car. min.)" class="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-800 focus:border-emerald-300 transition-all" required minlength="8">
          <div class="relative">
            <input id="regPhone" type="tel" placeholder="Téléphone (ex: 06 12 34 56 78)" class="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-800 focus:border-emerald-300 transition-all pr-10" required>
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-base">📱</span>
          </div>
          <p class="text-xs text-gray-400 font-medium -mt-1 px-1">🔒 Ton numéro est confidentiel — jamais visible par les autres utilisateurs.</p>
          <button type="submit" class="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all mt-2">Commencer ➜</button>
        </form>
        <div class="mt-6 text-center">
          <button onclick="navigate('/login')" class="text-xs text-gray-400 font-bold hover:text-emerald-600 transition-colors">Déjà un compte ? Se connecter</button>
        </div>
      </div>

      <!-- Étape 2 : Catégories -->
      <div id="wStep2" class="wizard-step hidden p-8 md:p-10">
        <div class="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl mb-6">📦</div>
        <h2 class="text-2xl font-black text-gray-900 mb-1 tracking-tight">Tes objets</h2>
        <p class="text-sm text-gray-400 font-medium mb-6">Dans quels domaines as-tu des objets peu utilisés ? <span class="text-emerald-600 font-black">(Choix multiples)</span></p>
        <div class="grid grid-cols-2 gap-3 mb-8">
          ${[['🛠️','Bricolage'],['📚','Livres / Études'],['⚽','Sport & Loisirs'],['🎮','Jeux / Électro'],['🍳','Cuisine'],['🧳','Voyage'],['🎸','Musique'],['🪴','Maison / Déco']].map(([icon, label]) => `
          <button type="button" onclick="wizardToggle(this)" data-val="${label}"
            class="wizard-choice flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-100 text-left font-bold text-sm text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
            <span class="text-xl">${icon}</span><span>${label}</span>
          </button>`).join('')}
        </div>
        <button onclick="wizardNext()" id="wNextBtn2" disabled class="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all opacity-50">Continuer ➜</button>
      </div>

      <!-- Étape 3 : Fréquence -->
      <div id="wStep3" class="wizard-step hidden p-8 md:p-10">
        <div class="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mb-6">🤔</div>
        <h2 class="text-2xl font-black text-gray-900 mb-1 tracking-tight">Combien d'objets ?</h2>
        <p class="text-sm text-gray-400 font-medium mb-6">Parmi tes affaires, combien n'ont <span class="text-blue-600 font-black">pas été utilisés depuis 3 mois</span> ou plus ?</p>
        <div class="space-y-3 mb-8">
          ${[['0','Aucun... je suis minimaliste 😅'],['1-3','1 à 3 objets 🤔'],['4-10','4 à 10 objets 📦'],['10+','Plus de 10, j\'ai de la place à libérer ! 🏠']].map(([val, label]) => `
          <button type="button" onclick="wizardSingle(this,'freq')" data-val="${val}"
            class="wizard-single w-full p-4 rounded-xl border-2 border-gray-100 text-left font-bold text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-all">
            ${label}
          </button>`).join('')}
        </div>
        <button onclick="wizardNext()" id="wNextBtn3" disabled class="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all opacity-50">Continuer ➜</button>
      </div>

      <!-- Étape 4 : Motivation -->
      <div id="wStep4" class="wizard-step hidden p-8 md:p-10">
        <div class="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl mb-6">💡</div>
        <h2 class="text-2xl font-black text-gray-900 mb-1 tracking-tight">Ta motivation</h2>
        <p class="text-sm text-gray-400 font-medium mb-6">Qu'est-ce qui t'<span class="text-purple-600 font-black">encouragerait le plus</span> à prêter un objet ?</p>
        <div class="space-y-3 mb-8">
          ${[['service','🤝 Rendre service à un camarade'],['place','📦 Libérer de la place chez moi'],['rep','⭐ Construire ma réputation sur PolyEarth'],['all','✨ Un peu de tout ça !']].map(([val, label]) => `
          <button type="button" onclick="wizardSingle(this,'motiv')" data-val="${val}"
            class="wizard-single w-full p-4 rounded-xl border-2 border-gray-100 text-left font-bold text-sm text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-all">
            ${label}
          </button>`).join('')}
        </div>
        <button onclick="wizardNext()" id="wNextBtn4" disabled class="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all opacity-50">Continuer ➜</button>
      </div>

      <!-- Étape 5 : Premier objet -->
      <div id="wStep5" class="wizard-step hidden p-8 md:p-10">
        <div class="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl mb-6">🚀</div>
        <h2 class="text-2xl font-black text-gray-900 mb-1 tracking-tight">Ton premier objet</h2>
        <p class="text-sm text-gray-400 font-medium mb-6">Quel objet pourrais-tu proposer <span class="text-orange-500 font-black">dès maintenant</span> à tes camarades ?</p>
        <input id="firstItemName" type="text" placeholder="Ex: perceuse Bosch, livre de Maths S3..." oninput="wizardInputCheck(this)"
          class="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-gray-800 focus:border-orange-300 transition-all mb-4">
        <div class="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-8 text-sm text-orange-700 font-medium">
          ✨ Tu pourras publier cette annonce en un clic dès la création de ton compte !
        </div>
        <button onclick="wizardNext()" id="wNextBtn5" disabled class="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all opacity-50">Presque fini ➜</button>
      </div>

      <!-- Étape 6 : Score & création -->
      <div id="wStep6" class="wizard-step hidden p-8 md:p-10 text-center">
        <div class="relative w-28 h-28 mx-auto mb-6">
          <svg class="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" stroke-width="8"/>
            <circle id="scoreCircle" cx="50" cy="50" r="42" fill="none" stroke="url(#sg)" stroke-width="8"
              stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="264" style="transition:stroke-dashoffset 1.2s ease"/>
            <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#14b8a6"/>
            </linearGradient></defs>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span id="scoreValue" class="text-3xl font-black text-emerald-600">0</span>
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">/ 100</span>
          </div>
        </div>
        <h2 class="text-2xl font-black text-gray-900 mb-2 tracking-tight">Ton Score Partage</h2>
        <p id="scoreMsg" class="text-sm text-gray-500 font-medium mb-6 px-4">Calcul en cours...</p>
        <div id="scoreDetails" class="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-8 text-left space-y-2">
          <p id="scoreDetail1" class="text-sm font-bold text-emerald-700"></p>
          <p id="scoreDetail2" class="text-sm font-bold text-emerald-700"></p>
        </div>
        <button onclick="doRegisterWizard()" id="wFinalBtn"
          class="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all">
          Créer mon compte 🌱
        </button>
        <p class="text-xs text-gray-300 font-medium mt-4">En créant un compte tu acceptes les conditions d'utilisation.</p>
      </div>

    </div>
  </div>
</div>
`;

/**
 * Page de présentation de l'association.
 * @returns {string} HTML de la page.
 */
export const associationPage = () => `
    <div class="max-w-4xl mx-auto space-y-12 animate-fade-in">
        <div class="flex flex-col items-center text-center space-y-4">
            <img src="/logo-polyearth.png" alt="PolyEarth Logo" class="w-32 h-32 object-contain rounded-xl shadow-xl shadow-emerald-100 mb-4">
            <h2 class="text-5xl font-black text-gray-900 tracking-tighter">L'Association</h2>
            <p class="text-gray-500 font-medium max-w-xl">PolyEarth — Association étudiante pour le partage et la durabilité à Polytech Montpellier.</p>
        </div>

        <div class="bg-duck rounded-3xl p-12 text-white shadow-2xl shadow-duck/10 relative overflow-hidden">
            <div class="relative z-10">
                <h3 class="text-3xl font-black mb-6">Notre Vision</h3>
                <p class="text-white/90 text-xl font-medium leading-relaxed italic">"Partager plus qu'un campus."</p>
                <p class="text-white/80 text-lg font-medium leading-relaxed mt-4">PolyEarth favorise l'économie circulaire et l'entraide entre les étudiants de Polytech Montpellier. Emprunter plutôt qu'acheter, c'est notre devise pour réduire notre empreinte tout en renforçant les liens sur le campus.</p>
            </div>
            <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-duck-light rounded-full opacity-50 blur-3xl"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Section Instagram -->
            <div class="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                        <h4 class="font-black text-gray-900">Instagram</h4>
                    </div>
                    <a href="https://www.instagram.com/polyearth_polytech_montpellier/" target="_blank" class="text-[10px] font-black text-duck uppercase tracking-widest hover:underline">S'abonner</a>
                </div>
                <div class="aspect-[4/5] bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center">
                    <iframe src="https://www.instagram.com/polyearth_polytech_montpellier/embed" class="w-full h-full border-none" scrolling="no" allowtransparency="true"></iframe>
                </div>
            </div>

            <!-- Section Facebook -->
            <div class="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </div>
                        <h4 class="font-black text-gray-900">Facebook</h4>
                    </div>
                    <a href="https://www.facebook.com/Polyearth" target="_blank" class="text-[10px] font-black text-blue-700 uppercase tracking-widest hover:underline">Voir la page</a>
                </div>
                <div class="aspect-[4/5] bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    <iframe src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FPolyearth&tabs=timeline&width=340&height=500&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false" class="w-full h-full border-none" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
                </div>
            </div>
        </div>
    </div>
`;
