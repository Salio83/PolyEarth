const content = document.getElementById('content');
const API_URL = 'http://localhost:8000/api';

const routes = {
    '/': () => {
        if (!isLoggedIn()) return navigate('/login');
        content.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <!-- Hero Search Section -->
                <div class="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h2 class="text-3xl font-black text-gray-900 mb-6 tracking-tight">Que recherchez-vous aujourd'hui ?</h2>
                    <div class="flex flex-col md:flex-row gap-4">
                        <div class="flex-1 relative">
                            <input type="text" placeholder="Rechercher sur PolyEarth" class="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 absolute left-4 top-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button class="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Rechercher</button>
                    </div>
                    <div class="flex flex-wrap gap-3 mt-6">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2 py-2">Tendances :</span>
                        <button class="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold hover:bg-emerald-100 transition-colors">Calculatrices</button>
                        <button class="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold hover:bg-emerald-100 transition-colors">Livres Prépa</button>
                        <button class="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold hover:bg-emerald-100 transition-colors">Vélos</button>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-end mb-6">
                        <h3 class="text-2xl font-black text-gray-900">Dernières annonces</h3>
                        <a href="/offres" class="text-emerald-600 font-bold hover:underline">Voir tout</a>
                    </div>
                    <div id="offersGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <!-- Items will be injected here -->
                        <div class="col-span-full text-center py-20 text-gray-400">Chargement...</div>
                    </div>
                </div>
            </div>
        `;
        fetchItems();
    },
    '/offres': () => {
        if (!isLoggedIn()) return navigate('/login');
        content.innerHTML = `
            <div class="flex flex-col md:flex-row gap-8">
                <!-- Filters Sidebar -->
                <aside class="w-full md:w-64 space-y-6">
                    <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h4 class="font-black text-gray-900 mb-4 uppercase text-xs tracking-widest">Filtres</h4>
                        <div class="space-y-4">
                            <div>
                                <label class="text-sm font-bold text-gray-500 block mb-2">Catégorie</label>
                                <select class="w-full p-2 bg-gray-50 border-none rounded-lg text-sm font-medium outline-none">
                                    <option>Toutes les catégories</option>
                                    <option>Matériel</option>
                                    <option>Livres</option>
                                    <option>Services</option>
                                    <option>Sport</option>
                                    <option>Autre</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-sm font-bold text-gray-500 block mb-2">État</label>
                                <div class="space-y-2">
                                    <label class="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
                                        <input type="checkbox" class="rounded text-emerald-600"> <span>Neuf</span>
                                    </label>
                                    <label class="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
                                        <input type="checkbox" class="rounded text-emerald-600"> <span>Bon état</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                <main class="flex-1">
                    <div class="mb-8 flex justify-between items-center">
                        <h2 class="text-3xl font-black text-gray-900">Toutes les offres</h2>
                        <button onclick="showAddItemModal()" class="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                            </svg>
                            <span>Publier</span>
                        </button>
                    </div>
                    <div id="offersGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- Items will be injected here -->
                    </div>
                </main>
            </div>

            <!-- Modal Ajout -->
            <div id="modal" class="hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                <div class="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl animate-scale-up">
                    <div class="flex justify-between items-start mb-8">
                        <div>
                            <h3 class="text-3xl font-black text-gray-900">Nouvelle annonce</h3>
                            <p class="text-gray-400 font-medium">Décrivez ce que vous souhaitez partager.</p>
                        </div>
                        <button onclick="hideAddItemModal()" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form onsubmit="addItem(event)" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Titre de l'annonce</label>
                                <input id="itemName" placeholder="Ex: Calculatrice TI-84" class="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold text-gray-800" required>
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Catégorie</label>
                                <select id="itemCategory" class="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold text-gray-800" required>
                                    <option value="Matériel">Matériel</option>
                                    <option value="Livres">Livres</option>
                                    <option value="Services">Services</option>
                                    <option value="Sport">Sport</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Photo de l'objet</label>
                            <input id="itemPhoto" type="file" accept="image/*" class="w-full p-3 bg-gray-50 border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl outline-none transition-all font-medium text-gray-500 cursor-pointer">
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-black text-gray-400 uppercase tracking-widest">Description détaillée</label>
                            <textarea id="itemDesc" placeholder="Détails, état, conditions de prêt..." class="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none h-40 transition-all font-medium text-gray-700" required></textarea>
                        </div>
                        <div class="flex space-x-4 pt-4">
                            <button type="button" onclick="hideAddItemModal()" class="flex-1 px-4 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all">Annuler</button>
                            <button type="submit" class="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">Publier l'annonce</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        fetchItems();
    },
    '/profil': () => {
        if (!isLoggedIn()) return navigate('/login');
        const user = getUser();
        content.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <div class="bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-12">
                    <div class="relative">
                        <div class="w-40 h-40 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-6xl font-black shadow-inner">
                            ${user.name.charAt(0)}
                        </div>
                        <div class="absolute bottom-2 right-2 w-10 h-10 bg-blue-600 border-4 border-white rounded-full flex items-center justify-center text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                        </div>
                    </div>
                    
                    <div class="flex-1 text-center md:text-left">
                        <div class="flex items-center justify-center md:justify-start space-x-3 mb-2">
                            <h2 class="text-4xl font-black text-gray-900">${user.name}</h2>
                            <span class="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter border border-blue-100">Vérifié</span>
                        </div>
                        <p class="text-gray-400 font-bold text-lg mb-8 italic">Étudiant @ Polytech Montpellier</p>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                            <div class="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <div class="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Coordonnées</div>
                                <div class="font-bold text-gray-700">${user.email}</div>
                            </div>
                            <div class="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                <div class="text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-1">Impact</div>
                                <div class="font-bold text-emerald-700">3 objets partagés</div>
                            </div>
                        </div>

                        <div class="flex justify-center md:justify-start space-x-4">
                            <button class="bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all">Éditer le profil</button>
                            <button onclick="logout()" class="text-red-500 font-bold hover:bg-red-50 px-8 py-3 rounded-2xl transition-all border border-transparent hover:border-red-100">Déconnexion</button>
                        </div>
                    </div>
                </div>

                <!-- Mes Publications -->
                <div class="mt-16 space-y-8">
                    <div class="flex items-center justify-between">
                        <h3 class="text-3xl font-black text-gray-900 tracking-tight">Mes publications</h3>
                        <span class="bg-gray-100 text-gray-500 text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest">Gérer mes annonces</span>
                    </div>
                    <div id="myItemsGrid" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- My items will be injected here -->
                        <div class="col-span-full text-center py-20 text-gray-300 animate-pulse">Chargement de vos publications...</div>
                    </div>
                </div>
            </div>
        `;
        fetchMyItems();
    },
    '/association': () => {
        if (!isLoggedIn()) return navigate('/login');
        content.innerHTML = `
            <div class="max-w-5xl mx-auto space-y-12">
                <div class="text-center space-y-4">
                    <h2 class="text-5xl font-black text-gray-900 tracking-tighter">L'Association</h2>
                    <p class="text-xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        Construire ensemble une communauté étudiante plus durable et solidaire à Polytech Montpellier.
                    </p>
                </div>
                
                <div class="bg-emerald-600 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-emerald-200">
                    <div class="relative z-10">
                        <h3 class="text-3xl font-black mb-6">Notre Vision</h3>
                        <p class="text-emerald-50 text-xl leading-relaxed font-medium max-w-3xl">
                            PolyEarth est née d'un constat simple : nous possédons tous des objets qui dorment dans nos placards alors qu'ils pourraient servir à d'autres. 
                            Nous croyons en l'économie circulaire et le partage comme piliers de la vie étudiante de demain.
                        </p>
                    </div>
                    <!-- Decorative element -->
                    <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500 rounded-full opacity-50 blur-3xl"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                        <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-6">🌱</div>
                        <h4 class="font-black text-gray-900 text-xl mb-3">Écologie</h4>
                        <p class="text-gray-500 font-medium leading-relaxed">Réduire la surconsommation en favorisant la seconde main et le prêt.</p>
                    </div>
                    <div class="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                        <div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-6">🤝</div>
                        <h4 class="font-black text-gray-900 text-xl mb-3">Entraide</h4>
                        <p class="text-gray-500 font-medium leading-relaxed">Créer du lien social entre les différentes spécialités de l'école.</p>
                    </div>
                    <div class="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                        <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-6">🎯</div>
                        <h4 class="font-black text-gray-900 text-xl mb-3">Impact</h4>
                        <p class="text-gray-500 font-medium leading-relaxed">Une plateforme gratuite, gérée par et pour les étudiants.</p>
                    </div>
                </div>
            </div>
        `;
    },
    '/login': () => {
        content.innerHTML = `
            <div class="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 mt-10 animate-fade-in">
                <h2 class="text-3xl font-black mb-2 text-center text-gray-900 tracking-tight">Bonjour !</h2>
                <p class="text-gray-400 text-center mb-10 font-medium">Connectez-vous pour découvrir les annonces.</p>
                <div id="error" class="text-red-500 mb-6 text-sm text-center font-bold bg-red-50 py-2 rounded-xl hidden"></div>
                <form onsubmit="login(event)" class="space-y-5">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Adresse email</label>
                        <input id="email" type="email" placeholder="Email institutionnel" class="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium" required>
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mot de passe</label>
                        <input id="password" type="password" placeholder="Votre mot de passe" class="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all transform active:scale-[0.98]">Se connecter</button>
                </form>
                <p class="mt-10 text-sm text-center text-gray-500 font-medium">
                    Envie de nous rejoindre ? <a href="javascript:void(0)" onclick="navigate('/register')" class="text-emerald-600 font-black hover:underline">Créer un compte</a>
                </p>
            </div>
        `;
    },
    '/register': () => {
        content.innerHTML = `
            <div class="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 mt-10 animate-fade-in">
                <h2 class="text-3xl font-black mb-2 text-center text-gray-900 tracking-tight">Bienvenue</h2>
                <p class="text-gray-400 text-center mb-10 font-medium">Créez votre compte PolyEarth en quelques secondes.</p>
                <div id="msg" class="text-blue-600 mb-6 text-sm text-center font-bold bg-blue-50 py-2 rounded-xl hidden"></div>
                <form onsubmit="register(event)" class="space-y-5">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nom complet</label>
                        <input id="regName" placeholder="Prénom et Nom" class="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium" required>
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email @umontpellier.fr</label>
                        <input id="regEmail" type="email" placeholder="votre.nom@etu.umontpellier.fr" class="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium" required>
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mot de passe</label>
                        <input id="regPassword" type="password" placeholder="Choisir un mot de passe" class="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-medium" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all transform active:scale-[0.98]">Créer mon compte</button>
                </form>
                <p class="mt-10 text-sm text-center text-gray-500 font-medium">
                    Déjà inscrit ? <a href="javascript:void(0)" onclick="navigate('/login')" class="text-emerald-600 font-black hover:underline">Se connecter</a>
                </p>
            </div>
        `;
    }
};

// --- AUTH LOGIC ---
function isLoggedIn() { return !!localStorage.getItem('user'); }
function getUser() { return JSON.parse(localStorage.getItem('user')); }
function logout() { localStorage.removeItem('user'); navigate('/login'); }

window.login = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('user', JSON.stringify(data));
            navigate('/');
        } else {
            document.getElementById('error').innerText = data.message;
        }
    } catch (err) {
        document.getElementById('error').innerText = "Serveur injoignable.";
    }
};

window.register = async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        document.getElementById('msg').innerText = data.message;
    } catch (err) {
        document.getElementById('msg').innerText = "Erreur de connexion.";
    }
};

// --- MODAL LOGIC ---
window.showAddItemModal = () => document.getElementById('modal').classList.remove('hidden');
window.hideAddItemModal = () => document.getElementById('modal').classList.add('hidden');

// --- DATA LOGIC ---
const categoryIcons = {
    'Matériel': '🛠️',
    'Livres': '📚',
    'Services': '🤝',
    'Sport': '⚽',
    'Autre': '📦'
};

function formatRelativeDate(dateStr) {
    if (!dateStr) return "Récemment";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "À l'instant";
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

async function fetchItems() {
    try {
        const res = await fetch(`${API_URL}/items`);
        let items = await res.json();
        const grid = document.getElementById('offersGrid');
        if (!grid) return;

        const user = getUser();
        // Ne pas afficher ses propres annonces dans les vues générales
        items = items.filter(i => i.owner_id !== user.id);

        if (items.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-400 font-medium">Aucune offre pour le moment. Soyez le premier à partager !</div>';
            return;
        }

        grid.innerHTML = items.map(i => `
            <div onclick="navigate('/item/${i.id}')" class="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer animate-fade-in">
                <div class="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    ${i.photo_url ? 
                        `<img src="${i.photo_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='https://placehold.co/600x400?text=Image+non+disponible'">` :
                        `<div class="absolute inset-0 flex flex-col items-center justify-center text-gray-300 group-hover:scale-110 transition-transform duration-500">
                            <span class="text-5xl mb-2">${categoryIcons[i.category] || '📦'}</span>
                            <span class="text-xs font-black uppercase tracking-widest text-gray-400">${i.category || 'Objet'}</span>
                        </div>`
                    }
                    <div class="absolute top-3 left-3">
                        <span class="bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg">${i.category || 'Disponible'}</span>
                    </div>
                </div>
                <div class="p-5 space-y-2">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors flex-1">${i.name}</h4>
                        <span class="text-[10px] font-bold text-gray-400 whitespace-nowrap ml-2">${formatRelativeDate(i.created_at)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-emerald-600 font-black text-lg">Prêt</span>
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Polytech</span>
                    </div>
                    <div class="pt-3 border-t border-gray-50 flex items-center space-x-2">
                        <div class="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-black">
                            ${i.owner_name ? i.owner_name.charAt(0) : '?'}
                        </div>
                        <span class="text-xs font-medium text-gray-500">${i.owner_name || 'Anonyme'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function fetchMyItems() {
    try {
        const res = await fetch(`${API_URL}/items`);
        const items = await res.json();
        const grid = document.getElementById('myItemsGrid');
        if (!grid) return;

        const user = getUser();
        const myItems = items.filter(i => i.owner_id === user.id);

        if (myItems.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-10 text-gray-400 font-medium text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">Vous n\'avez encore publié aucune annonce.</div>';
            return;
        }

        grid.innerHTML = myItems.map(i => `
            <div class="flex items-center gap-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm animate-fade-in group hover:shadow-md transition-all">
                <div class="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0">
                    ${i.photo_url ? 
                        `<img src="${i.photo_url}" class="w-full h-full object-cover">` :
                        `<div class="w-full h-full flex items-center justify-center text-2xl">${categoryIcons[i.category] || '📦'}</div>`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">${i.category}</div>
                    <h4 class="font-bold text-gray-900 truncate mb-1">${i.name}</h4>
                    <div class="text-xs text-gray-400 font-bold">Publiée ${formatRelativeDate(i.created_at)}</div>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <button onclick="navigate('/item/${i.id}')" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button onclick="deleteItem(${i.id})" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

// --- NOTIFICATIONS ---
function showNotification(message, type = 'success') {
    const existing = document.getElementById('notification-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = `fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl animate-scale-up ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`;
    
    const icon = type === 'success' ? 
        `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>` :
        `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`;

    container.innerHTML = `
        ${icon}
        <span class="font-bold">${message}</span>
    `;

    document.body.appendChild(container);

    setTimeout(() => {
        container.style.opacity = '0';
        container.style.transform = 'translate(-50%, 20px)';
        container.style.transition = 'all 0.5s ease-in-out';
        setTimeout(() => container.remove(), 500);
    }, 3000);
}

window.deleteItem = async (id) => {
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    
    try {
        const res = await fetch(`${API_URL}/items/${id}`, {
            method: 'DELETE',
            headers: { 
                'X-Sharer-User-Id': getUser().id
            }
        });
        
        if (res.ok) {
            showNotification("L'annonce a été supprimée avec succès.");
            fetchMyItems();
        } else {
            showNotification("Erreur lors de la suppression.", "error");
        }
    } catch (err) {
        showNotification("Erreur de connexion au serveur.", "error");
    }
};

async function renderItemDetail(id) {
    content.innerHTML = '<div class="text-center py-20 text-gray-400 animate-pulse">Chargement de l\'annonce...</div>';
    try {
        const res = await fetch(`${API_URL}/items/${id}`);
        const item = await res.json();
        
        if (!res.ok) throw new Error();

        content.innerHTML = `
            <div class="max-w-6xl mx-auto animate-fade-in">
                <button onclick="navigate('/offres')" class="mb-6 flex items-center space-x-2 text-gray-500 hover:text-emerald-600 font-bold transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                    </svg>
                    <span>Retour aux annonces</span>
                </button>

                <div class="flex flex-col lg:flex-row gap-10">
                    <!-- Image Gallery (Left) -->
                    <div class="flex-1">
                        <div class="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 aspect-video lg:aspect-square relative group">
                            ${item.photo_url ? 
                                `<img src="${item.photo_url}" class="w-full h-full object-contain bg-gray-50">` :
                                `<div class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-200">
                                    <span class="text-9xl mb-4">${categoryIcons[item.category] || '📦'}</span>
                                    <span class="text-sm font-black uppercase tracking-[0.2em] text-gray-300">${item.category || 'Objet'}</span>
                                </div>`
                            }
                            <div class="absolute top-6 left-6">
                                <span class="bg-emerald-600 text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl">En ligne</span>
                            </div>
                        </div>
                    </div>

                    <!-- Item Details (Right) -->
                    <div class="w-full lg:w-[400px] space-y-6">
                        <div class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div>
                                <h2 class="text-3xl font-black text-gray-900 leading-tight mb-2">${item.name}</h2>
                                <div class="flex items-center space-x-3 text-emerald-600 font-black text-xl">
                                    <span>Prêt Gratuit</span>
                                    <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span class="text-gray-400 text-sm font-bold uppercase tracking-widest">${item.category}</span>
                                </div>
                            </div>

                            <div class="text-xs text-gray-400 font-bold uppercase tracking-widest">Publiée ${formatRelativeDate(item.created_at)}</div>

                            <div class="pt-6 border-t border-gray-50 space-y-4">
                                <h3 class="font-black text-gray-900 uppercase text-xs tracking-widest">Description</h3>
                                <p class="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">${item.description}</p>
                            </div>
                        </div>

                        <!-- Owner Info -->
                        <div class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                            <h3 class="font-black text-gray-900 uppercase text-xs tracking-widest mb-6">Proposé par</h3>
                            <div class="flex items-center space-x-4 mb-8">
                                <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl font-black">
                                    ${item.owner_name.charAt(0)}
                                </div>
                                <div>
                                    <div class="font-black text-gray-900 text-lg">${item.owner_name}</div>
                                    <div class="text-sm text-gray-400 font-bold italic">Étudiant vérifié</div>
                                </div>
                            </div>
                            <button onclick="alert('Contact: ${item.owner_email}')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 group">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                </svg>
                                <span>Contacter</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = '<div class="text-center py-20 text-red-500 font-bold">Impossible de charger l\'annonce. Elle a peut-être été supprimée.</div>';
    }
}

window.addItem = async (e) => {
    e.preventDefault();
    const name = document.getElementById('itemName').value;
    const category = document.getElementById('itemCategory').value;
    const photoInput = document.getElementById('itemPhoto');
    const description = document.getElementById('itemDesc').value;
    
    let photo_url = "";
    if (photoInput.files && photoInput.files[0]) {
        photo_url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(photoInput.files[0]);
        });
    }
    
    await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Sharer-User-Id': getUser().id
        },
        body: JSON.stringify({ name, description, category, photo_url })
    });
    hideAddItemModal();
    fetchItems();
};

// --- NAVIGATION ---
window.navigate = (path) => {
    window.history.pushState({}, '', path);
    handleRoute();
};

const handleRoute = () => {
    const path = window.location.pathname;
    
    // Support dynamic route /item/:id
    const itemMatch = path.match(/^\/item\/(\d+)$/);
    if (itemMatch) {
        if (!isLoggedIn()) return navigate('/login');
        return renderItemDetail(itemMatch[1]);
    }

    const route = routes[path] || routes['/'];
    route();
};
window.onpopstate = handleRoute;

document.addEventListener('click', e => {
    if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('/')) {
        e.preventDefault();
        navigate(e.target.getAttribute('href'));
    }
});

handleRoute();
