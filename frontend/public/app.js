const content = document.getElementById('content');
const API_URL = 'http://localhost:8000/api';

const routes = {
    '/': () => {
        if (!isLoggedIn()) return navigate('/login');
        content.innerHTML = `
            <div class="text-center py-20 animate-fade-in">
                <h2 class="text-6xl font-black text-gray-900 mb-6 tracking-tighter">PolyEarth</h2>
                <p class="text-2xl text-gray-600 mb-10 max-w-2xl mx-auto">La plateforme de partage durable pour les étudiants de Polytech Montpellier.</p>
                <div class="flex justify-center space-x-6">
                    <button onclick="navigate('/offres')" class="bg-green-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all hover:scale-105">Explorer les offres</button>
                    <button onclick="navigate('/association')" class="bg-white border-2 border-green-600 text-green-600 px-10 py-4 rounded-2xl font-bold hover:bg-green-50 transition-all">L'Association</button>
                </div>
            </div>
        `;
    },
    '/offres': () => {
        if (!isLoggedIn()) return navigate('/login');
        content.innerHTML = `
            <div class="mb-10 flex justify-between items-center">
                <h2 class="text-4xl font-extrabold text-gray-900">Offres en cours</h2>
                <button onclick="showAddItemModal()" class="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 shadow-md transition-all">+ Publier une offre</button>
            </div>
            <div id="offersGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Les offres seront injectées ici -->
                <div class="col-span-full text-center py-10 text-gray-400">Chargement des offres...</div>
            </div>

            <!-- Modal Ajout (Simple simulation) -->
            <div id="modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div class="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                    <h3 class="text-2xl font-bold mb-6">Nouvelle offre</h3>
                    <form onsubmit="addItem(event)" class="space-y-4">
                        <input id="itemName" placeholder="Nom de l'objet" class="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-green-500 outline-none" required>
                        <textarea id="itemDesc" placeholder="Description de l'objet et conditions" class="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-green-500 outline-none h-32" required></textarea>
                        <div class="flex space-x-3">
                            <button type="button" onclick="hideAddItemModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Annuler</button>
                            <button type="submit" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Publier</button>
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
            <div class="max-w-2xl mx-auto">
                <div class="bg-white rounded-3xl p-10 shadow-sm border text-center">
                    <div class="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-6">
                        ${user.name.charAt(0)}
                    </div>
                    <h2 class="text-3xl font-black text-gray-900 mb-2">${user.name}</h2>
                    <p class="text-gray-500 mb-8 font-medium">Membre de Polytech Montpellier</p>
                    
                    <div class="grid grid-cols-2 gap-4 mb-10 text-left">
                        <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Email</div>
                            <div class="font-bold text-gray-700">${user.email}</div>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Statut</div>
                            <div class="font-bold text-green-600">Vérifié</div>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-gray-50">
                        <button onclick="logout()" class="text-red-500 font-bold hover:bg-red-50 px-6 py-2 rounded-xl transition-all">Se déconnecter</button>
                    </div>
                </div>
            </div>
        `;
    },
    '/association': () => {
        if (!isLoggedIn()) return navigate('/login');
        content.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <h2 class="text-4xl font-extrabold mb-8 text-gray-900">L'Association</h2>
                <div class="bg-green-600 rounded-3xl p-10 text-white mb-8 shadow-xl shadow-green-100">
                    <h3 class="text-2xl font-bold mb-4">Notre Vision</h3>
                    <p class="text-green-50 text-lg leading-relaxed">
                        PolyEarth est née de la volonté des étudiants de Polytech Montpellier de réduire leur impact environnemental. 
                        Nous croyons que le partage de ressources est la première étape vers une économie circulaire au sein de notre école.
                    </p>
                </div>
                <div class="grid grid-cols-2 gap-6">
                    <div class="bg-white p-6 rounded-3xl border shadow-sm">
                        <h4 class="font-black text-gray-900 mb-2">🌱 Écologie</h4>
                        <p class="text-gray-500 text-sm">Réduire les déchets en favorisant la réutilisation.</p>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border shadow-sm">
                        <h4 class="font-black text-gray-900 mb-2">🤝 Entraide</h4>
                        <p class="text-gray-500 text-sm">Se prêter du matériel entre étudiants ingénieurs.</p>
                    </div>
                </div>
            </div>
        `;
    },
    '/login': () => {
        content.innerHTML = `
            <div class="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-xl border border-gray-100 mt-10">
                <h2 class="text-3xl font-black mb-2 text-center text-gray-900">Content de vous revoir</h2>
                <p class="text-gray-400 text-center mb-8 font-medium">Connectez-vous à PolyEarth</p>
                <div id="error" class="text-red-500 mb-4 text-sm text-center font-bold"></div>
                <form onsubmit="login(event)" class="space-y-4">
                    <input id="email" type="email" placeholder="Email institutionnel" class="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-green-500 outline-none transition-all" required>
                    <input id="password" type="password" placeholder="Mot de passe" class="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-green-500 outline-none transition-all" required>
                    <button type="submit" class="w-full bg-green-600 text-white py-4 rounded-xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all">Connexion</button>
                </form>
                <p class="mt-8 text-sm text-center text-gray-500 font-medium">
                    Nouveau ici ? <a href="javascript:void(0)" onclick="navigate('/register')" class="text-green-600 font-bold hover:underline">Créer un compte</a>
                </p>
            </div>
        `;
    },
    '/register': () => {
        content.innerHTML = `
            <div class="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-xl border border-gray-100 mt-10">
                <h2 class="text-3xl font-black mb-2 text-center text-gray-900">Rejoindre l'aventure</h2>
                <p class="text-gray-400 text-center mb-8 font-medium">Inscrivez-vous à la plateforme</p>
                <div id="msg" class="text-blue-600 mb-4 text-sm text-center font-bold"></div>
                <form onsubmit="register(event)" class="space-y-4">
                    <input id="regName" placeholder="Votre prénom et nom" class="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-green-500 outline-none transition-all" required>
                    <input id="regEmail" type="email" placeholder="Email @umontpellier.fr" class="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-green-500 outline-none transition-all" required>
                    <input id="regPassword" type="password" placeholder="Choisir un mot de passe" class="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-green-500 outline-none transition-all" required>
                    <button type="submit" class="w-full bg-green-600 text-white py-4 rounded-xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all">S'inscrire</button>
                </form>
                <p class="mt-8 text-sm text-center text-gray-500 font-medium">
                    Déjà membre ? <a href="javascript:void(0)" onclick="navigate('/login')" class="text-green-600 font-bold hover:underline">Se connecter</a>
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
async function fetchItems() {
    try {
        const res = await fetch(`${API_URL}/items`);
        const items = await res.json();
        const grid = document.getElementById('offersGrid');
        if (!grid) return;

        if (items.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-400 font-medium">Aucune offre pour le moment. Soyez le premier à partager !</div>';
            return;
        }

        grid.innerHTML = items.map(i => `
            <div class="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div class="flex justify-between items-start mb-4">
                    <span class="bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Disponible</span>
                    <div class="text-xs text-gray-400 font-bold">OBJET #${i.id}</div>
                </div>
                <h3 class="text-2xl font-black text-gray-900 mb-3">${i.name}</h3>
                <p class="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3">${i.description}</p>
                <div class="pt-6 border-t border-gray-50 flex items-center">
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 mr-3">
                        ${i.owner_name.charAt(0)}
                    </div>
                    <div class="text-sm">
                        <span class="text-gray-400 font-medium">Proposé par</span>
                        <div class="font-bold text-gray-800">${i.owner_name}</div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

window.addItem = async (e) => {
    e.preventDefault();
    const name = document.getElementById('itemName').value;
    const description = document.getElementById('itemDesc').value;
    await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Sharer-User-Id': getUser().id
        },
        body: JSON.stringify({ name, description })
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
