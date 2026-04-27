import { catIcon, catBadge, qBadge, stars, dispoBadge, fmtDate } from './lib.js';

export const homePage = () => `
    <div class="space-y-8 animate-fade-in">
        <div class="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 relative overflow-hidden">
            <div class="relative z-10">
                <h2 class="text-4xl font-black text-gray-900 mb-6 tracking-tight">Partageons plus qu'un campus. 🌱</h2>
                <div class="flex flex-col md:flex-row gap-4">
                    <div class="flex-1 relative">
                        <input id="searchInput" type="text" placeholder="Rechercher un objet..." class="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-700 rounded-xl outline-none transition-all font-bold">
                        <svg class="h-6 w-6 absolute left-4 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <button onclick="doSearch()" class="bg-gray-800 text-white px-8 py-4 rounded-xl font-black hover:bg-gray-900 shadow-lg transition-all">Rechercher</button>
                </div>
            </div>
            <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-50 rounded-full opacity-50 blur-3xl"></div>
        </div>

        <div>
            <div class="flex justify-between items-end mb-6">
                <h3 class="text-2xl font-black text-gray-900">Dernières offres</h3>
                <a href="/offres" class="text-emerald-700 font-bold hover:underline">Voir tout</a>
            </div>
            <div id="offersGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div class="col-span-full text-center py-20 text-gray-300 animate-pulse">Chargement...</div>
            </div>
        </div>
    </div>
`;

export const offresPage = () => `
    <div class="flex flex-col lg:flex-row gap-8">
        <aside class="w-full lg:w-64 space-y-4">
            <button onclick="showModal('modal')" class="w-full bg-emerald-700 text-white p-4 rounded-xl font-black hover:bg-emerald-800 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2">
                <span>➕ Publier une offre</span>
            </button>
            <div class="bg-white p-6 rounded-2xl border border-gray-100">
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

export const demandesPage = () => `
    <div class="flex flex-col lg:flex-row gap-8">
        <aside class="w-full lg:w-64 space-y-4">
            <button onclick="showModal('modal')" class="w-full bg-blue-700 text-white p-4 rounded-xl font-black hover:bg-blue-800 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2">
                <span>🔍 Publier une demande</span>
            </button>
            <div class="bg-white p-6 rounded-2xl border border-gray-100">
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
            <h2 class="text-3xl font-black text-gray-900 mb-8">Ils recherchent...</h2>
            <div id="demandsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </main>
    </div>
`;

export const messagesPage = () => `
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden flex h-[70vh] shadow-sm">
        <div class="w-full md:w-80 border-r border-gray-50 flex flex-col conv-sidebar">
            <div class="p-6 border-b border-gray-50"><h3 class="text-xl font-black text-gray-900">Messages</h3></div>
            <div id="convList" class="flex-1 overflow-y-auto"></div>
        </div>
        <div id="chatPanel" class="flex-1 flex flex-col hidden-mobile bg-gray-50/30">
            <div id="chatHeader" class="p-4 border-b border-gray-50 bg-white flex items-center">
                <div class="text-sm font-bold text-gray-400">Sélectionnez une discussion</div>
            </div>
            <div id="chatMessages" class="flex-1 overflow-y-auto p-6 space-y-4"></div>
            <div id="chatInputBar" class="p-4 bg-white border-t border-gray-50 hidden">
                <div class="flex gap-2">
                    <button id="toggleLoanBtn" onclick="toggleLoanForm()" class="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg font-bold text-xs hover:bg-gray-100 transition-all">📅 Prêt</button>
                    <input id="chatInput" placeholder="Écrire un message..." class="flex-1 bg-gray-50 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-700 transition-all outline-none">
                    <button onclick="sendReply()" class="p-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-all"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button>
                </div>
                <div id="chatLoanFormContainer" class="hidden mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-slide-in">
                    <div class="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">Détails du prêt</div>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <input id="chatLoanFrom" type="date" class="p-2 rounded-lg border-none text-xs font-bold">
                        <input id="chatLoanUntil" type="date" class="p-2 rounded-lg border-none text-xs font-bold">
                    </div>
                    <button onclick="sendLoanRequestFromChat()" class="w-full bg-emerald-700 text-white py-2 rounded-lg text-xs font-black shadow-lg shadow-emerald-100 hover:bg-emerald-800">Envoyer la demande</button>
                </div>
            </div>
        </div>
        <div id="chatInfoSidebar" class="w-64 border-l border-gray-50 bg-white p-6 hidden lg:flex flex-col">
            <div class="text-center py-20 text-gray-300 text-xs font-bold">Détails de l'objet</div>
        </div>
    </div>
`;

export const pretsPage = () => `
    <div class="max-w-4xl mx-auto space-y-8">
        <h2 class="text-3xl font-black text-gray-900">Mes Prêts & Emprunts</h2>
        <div id="loansList" class="space-y-4"></div>
    </div>
`;

export const profilPage = (u) => `
    <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-10 items-center">
            <div class="w-32 h-32 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-5xl font-black shadow-inner">${u.name?.charAt(0)}</div>
            <div class="flex-1 text-center md:text-left">
                <h2 class="text-4xl font-black text-gray-900 mb-2">${u.name}</h2>
                <p class="text-gray-400 font-bold mb-6 italic">Étudiant @ ${u.school || 'Polytech Montpellier'}</p>
                <div class="flex justify-center md:justify-start gap-4">
                    <button class="bg-gray-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-900 transition-all shadow-lg">Éditer</button>
                    <button onclick="doLogout()" class="text-red-500 font-bold px-8 py-3 rounded-xl border border-red-50 hover:bg-red-50 transition-all">Déconnexion</button>
                </div>
            </div>
        </div>
        <div class="mt-12">
            <h3 class="text-2xl font-black text-gray-900 mb-6">Mes annonces</h3>
            <div id="myItemsGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
        </div>
    </div>
`;

export const loginPage = () => `
    <div class="max-w-md mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100 mt-10">
        <h2 class="text-3xl font-black mb-10 text-center text-gray-900 tracking-tight">Bonjour ! 🌱</h2>
        <form onsubmit="doLogin(event)" class="space-y-6">
            <input id="email" type="email" placeholder="Email institutionnel" class="w-full p-4 bg-gray-50 border-none rounded-xl outline-none font-bold" required>
            <input id="password" type="password" placeholder="Mot de passe" class="w-full p-4 bg-gray-50 border-none rounded-xl outline-none font-bold" required>
            <button type="submit" class="w-full bg-emerald-700 text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-800 transition-all">Se connecter</button>
        </form>
        <p class="mt-8 text-center text-sm text-gray-400 font-bold">Pas encore de compte ? <a href="javascript:void(0)" onclick="navigate('/register')" class="text-emerald-700">Rejoindre PolyEarth</a></p>
    </div>
`;

export const registerPage = () => `
    <div class="max-w-md mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100 mt-10">
        <h2 class="text-3xl font-black mb-10 text-center text-gray-900 tracking-tight">Bienvenue 👋</h2>
        <form onsubmit="doRegister(event)" class="space-y-6">
            <input id="regName" placeholder="Prénom et Nom" class="w-full p-4 bg-gray-50 border-none rounded-xl outline-none font-bold" required>
            <input id="regEmail" type="email" placeholder="Email @etu.umontpellier.fr" class="w-full p-4 bg-gray-50 border-none rounded-xl outline-none font-bold" required>
            <input id="regPassword" type="password" placeholder="Mot de passe" class="w-full p-4 bg-gray-50 border-none rounded-xl outline-none font-bold" required>
            <button type="submit" class="w-full bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all">Créer mon compte</button>
        </form>
        <p class="mt-8 text-center text-sm text-gray-400 font-bold">Déjà inscrit ? <a href="javascript:void(0)" onclick="navigate('/login')" class="text-blue-600">Se connecter</a></p>
    </div>
`;

export const associationPage = () => `
    <div class="max-w-4xl mx-auto space-y-12 animate-fade-in">
        <div class="flex flex-col items-center text-center space-y-4">
            <img src="/logo-polyearth.png" alt="PolyEarth Logo" class="w-32 h-32 object-contain rounded-2xl shadow-xl shadow-emerald-100 mb-4">
            <h2 class="text-5xl font-black text-gray-900 tracking-tighter">L'Association</h2>
            <p class="text-gray-500 font-medium max-w-xl">PolyEarth — Association étudiante pour le partage et la durabilité à Polytech Montpellier.</p>
        </div>

        <div class="bg-emerald-800 rounded-3xl p-12 text-white shadow-2xl shadow-emerald-100 relative overflow-hidden">
            <div class="relative z-10">
                <h3 class="text-3xl font-black mb-6 text-white">Notre Vision</h3>
                <p class="text-emerald-50 text-xl font-medium leading-relaxed">PolyEarth favorise l'économie circulaire et l'entraide entre les étudiants de Polytech Montpellier. Emprunter plutôt qu'acheter, c'est notre devise pour réduire notre empreinte tout en renforçant les liens sur le campus.</p>
            </div>
            <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-700 rounded-full opacity-50 blur-3xl"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Instagram Section -->
            <div class="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                        <h4 class="font-black text-gray-900">Instagram</h4>
                    </div>
                    <a href="https://www.instagram.com/polyearth_polytech_montpellier/" target="_blank" class="text-[10px] font-black text-emerald-700 uppercase tracking-widest hover:underline">S'abonner</a>
                </div>
                <div class="aspect-[4/5] bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center">
                    <iframe src="https://www.instagram.com/polyearth_polytech_montpellier/embed" class="w-full h-full border-none" scrolling="no" allowtransparency="true"></iframe>
                </div>
            </div>

            <!-- Facebook Section -->
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

export const itemCard = (i) => `
    <div onclick="navigate('/item/${i.id}')" class="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer animate-fade-in">
        <div class="aspect-square bg-gray-50 relative overflow-hidden">
            ${i.photo_url ? `<img src="${i.photo_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">` : `<div class="absolute inset-0 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-500">${catIcon(i.category)}</div>`}
            <div class="absolute top-4 left-4 flex gap-2">${catBadge(i.category)}</div>
        </div>
        <div class="p-5 bg-emerald-50/40">
            <h4 class="font-bold text-gray-900 truncate group-hover:text-emerald-800 transition-colors mb-2">${i.name}</h4>
            <div class="flex justify-between items-center">
                <span class="text-[10px] font-black text-emerald-700 uppercase tracking-widest">${i.type === 'demand' ? '🔍 Demande' : '🎁 Prêt'}</span>
                <div class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-[10px] font-black">${i.owner_name?.charAt(0) || '?'}</div>
            </div>
        </div>
    </div>
`;

export const itemDetail = (i, isOwner) => `
    <div class="max-w-6xl mx-auto animate-fade-in">
        <button onclick="navigate('/')" class="mb-8 flex items-center gap-2 text-gray-400 hover:text-emerald-700 font-bold transition-all">← Retour</button>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div class="bg-white rounded-2xl overflow-hidden border border-gray-100 aspect-square relative shadow-sm">
                ${i.photo_url ? `<img src="${i.photo_url}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-[10rem]">${catIcon(i.category)}</div>`}
            </div>
            <div class="space-y-8">
                <div>
                    <div class="flex gap-2 mb-4">${catBadge(i.category)} ${qBadge(i.quality)}</div>
                    <h2 class="text-5xl font-black text-gray-900 mb-2">${i.name}</h2>
                    <div class="text-emerald-700 font-black text-xl tracking-widest uppercase">Prêt Gratuit</div>
                </div>
                <div class="p-8 bg-white rounded-2xl border border-gray-100 space-y-4 shadow-sm">
                    <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Description</h3>
                    <p class="text-gray-600 font-medium leading-relaxed">${i.description || 'Pas de description.'}</p>
                </div>
                ${isOwner ? '' : `
                <div class="p-8 bg-gray-900 rounded-2xl text-white space-y-6 shadow-2xl">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl">${i.owner_name?.charAt(0)}</div>
                        <div><div class="font-bold">${i.owner_name}</div><div class="text-white/40 text-xs font-bold uppercase tracking-widest">Propriétaire</div></div>
                    </div>
                    <div class="space-y-3 pt-4">
                        <textarea id="detailChatInput" placeholder="Bonjour ! J'aimerais beaucoup t'emprunter ton objet..." class="w-full bg-white/10 border-none rounded-xl p-4 text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-700 outline-none h-24 transition-all"></textarea>
                        <button onclick="initChat(${i.id},${i.owner_id})" class="w-full bg-emerald-700 text-white py-4 rounded-xl font-black hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20">Lancer la discussion</button>
                    </div>
                </div>`}
            </div>
        </div>
    </div>
`;

export const loanCard = (t, uid) => {
    const isOwner = t.owner_id === uid;
    const status = t.status;
    const otherName = isOwner ? t.borrower_name : t.owner_name;
    const cls = status === 'pending' ? 'bg-orange-50 border-orange-100' : status === 'accepted' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100';
    const textCls = status === 'pending' ? 'text-orange-700' : status === 'accepted' ? 'text-emerald-700' : 'text-gray-500';

    return `
        <div class="p-6 rounded-xl border ${cls} flex items-center gap-6 animate-fade-in group hover:shadow-md transition-all">
            <div class="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                ${t.item_photo ? `<img src="${t.item_photo}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-2xl bg-white">${catIcon(t.item_category)}</div>`}
            </div>
            <div class="flex-1">
                <div class="text-[10px] font-black uppercase tracking-[0.2em] ${textCls} mb-1">${status}</div>
                <h4 class="font-black text-gray-900">${t.item_name}</h4>
                <div class="text-xs text-gray-400 font-bold">${isOwner ? 'Prêté à' : 'Emprunté à'} ${otherName}</div>
            </div>
            <div class="text-right">
                <div class="text-xs font-black text-gray-900">${fmtDate(t.start_date)}</div>
                <div class="text-[10px] text-gray-400 font-bold uppercase">Retour : ${fmtDate(t.end_date)}</div>
            </div>
        </div>
    `;
};
