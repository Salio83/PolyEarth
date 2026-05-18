/**
 * @file lib.js
 * @description Bibliothèque de fonctions utilitaires pour le frontend PolyEarth.
 * Contient des helpers pour le DOM, les notifications, le formatage et les appels API.
 */

export const API = '/api';
export const WS_URL = `/ws`;

/**
 * Raccourci pour document.getElementById.
 * @param {string} id - L'ID de l'élément HTML.
 * @returns {HTMLElement|null} L'élément HTML trouvé ou null.
 */
export const $ = (id) => document.getElementById(id);

/**
 * Lit un cookie par son nom.
 * @param {string} name - Nom du cookie.
 * @returns {string|null} Valeur du cookie ou null.
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * Supprime un cookie par son nom.
 * @param {string} name - Nom du cookie.
 */
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Vérifie si un utilisateur est actuellement connecté.
 * On vérifie à la fois le cookie httpOnly (pour les appels API) et le localStorage (pour les données utilisateur).
 * @returns {boolean} True si connecté, false sinon.
 */
export const isLoggedIn = () => !!localStorage.getItem('user') || !!getCookie('auth_token');

/**
 * Récupère les données de l'utilisateur stockées localement.
 * @returns {Object} Les données de l'utilisateur.
 */
export const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');

/**
 * Récupère le token JWT depuis le cookie httpOnly.
 * @returns {string|null} Le token ou null.
 */
export const getToken = () => getCookie('auth_token') || localStorage.getItem('token');

/**
 * Affiche une notification temporaire à l'écran.
 * @param {string} message - Le message à afficher.
 * @param {string} type - Le type de notification ('success' ou 'error').
 */
export const notify = (message, type = 'success') => {
    const existing = $('notification-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = `fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl animate-scale-up ${
        type === 'success' ? 'bg-emerald-800 text-white' : 'bg-red-700 text-white'
    }`;

    const icon = type === 'success' ?
        `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>` :
        `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`;

    container.innerHTML = `${icon}<span class="font-bold">${message}</span>`;
    document.body.appendChild(container);

    setTimeout(() => {
        container.style.opacity = '0';
        container.style.transform = 'translate(-50%, 20px)';
        container.style.transition = 'all 0.5s ease-in-out';
        setTimeout(() => container.remove(), 500);
    }, 3000);
};

/**
 * Lit un fichier image et le convertit en chaîne Base64.
 * @param {File} file - Le fichier image.
 * @returns {Promise<string>} Une promesse résolue avec la chaîne Base64.
 */
export const readImgB64 = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
});

/**
 * Formate une chaîne de date en format lisible (fr-FR).
 * @param {string} dateStr - La date brute.
 * @returns {string} La date formatée.
 */
export const fmtDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Retourne l'icône (emoji) associée à une catégorie.
 * @param {string} cat - La catégorie.
 * @returns {string} L'emoji.
 */
export const catIcon = (cat) => {
    const icons = { 'Matériel': '🛠️', 'Livres': '📚', 'Services': '🤝', 'Sport': '⚽', 'Autre': '📦' };
    return icons[cat] || '📦';
};

/**
 * Génère le badge HTML pour une catégorie.
 * @param {string} cat - La catégorie.
 * @returns {string} Le HTML du badge.
 */
export const catBadge = (cat) => `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-100">${cat}</span>`;

/**
 * Génère le badge HTML pour la qualité d'un objet.
 * @param {string} q - La qualité ('new', 'good', 'fair').
 * @returns {string} Le HTML du badge.
 */
export const qBadge = (q) => {
    const colors = { 
        'new': 'bg-blue-50 text-blue-700 border-blue-100', 
        'good': 'bg-emerald-50 text-emerald-700 border-emerald-100', 
        'fair': 'bg-orange-50 text-orange-700 border-orange-100' 
    };
    return `<span class="${colors[q] || colors.good} text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border">${q}</span>`;
};

/**
 * Génère le composant HTML pour l'affichage de la note sous forme d'étoiles.
 * @param {number} rating - La note moyenne.
 * @param {number} count - Le nombre total de notes.
 * @returns {string} Le HTML des étoiles.
 */
export const stars = (rating, count) => `
    <div class="flex items-center gap-1">
        <div class="flex text-orange-400 text-[10px]">
            ${'★'.repeat(Math.round(rating || 0))}${'☆'.repeat(5 - Math.round(rating || 0))}
        </div>
        <span class="text-[10px] text-gray-400 font-bold">(${count || 0})</span>
    </div>
`;

/**
 * Génère le badge HTML de disponibilité d'un objet.
 * @param {string} from - Date de début.
 * @param {string} until - Date de fin.
 * @param {string} status - Statut actuel de l'objet.
 * @returns {string} Le HTML du badge.
 */
export const dispoBadge = (from, until, status) => {
    if (status !== 'available') {
        return `<span class="bg-orange-50 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-orange-100">${status === 'reserved' ? 'Réservé' : 'Prêté'}</span>`;
    }
    return `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-100">Disponible</span>`;
};

/**
 * Affiche une fenêtre modale par son ID.
 * @param {string} id - L'ID de la modale.
 */
export const showModal = (id) => $(id)?.classList.remove('hidden');

/**
 * Masque une fenêtre modale par son ID.
 * @param {string} id - L'ID de la modale.
 */
export const hideModal = (id) => $(id)?.classList.add('hidden');

// =============================================================================
// --- WRAPPER FETCH POUR LA GESTION DU JWT ---
// =============================================================================

const originalFetch = window.fetch;

/**
 * Intercepteur global pour window.fetch.
 * Utilise le cookie httpOnly pour l'authentification (plus sécurisé).
 * Ajoute aussi l'en-tête Authorization comme fallback.
 * Gère également la redirection vers la page de login en cas d'erreur 401.
 */
window.fetch = async (input, init = {}) => {
    // Priorité 1: utiliser le cookie httpOnly (plus sécurisé)
    // Priorité 2: fallback sur localStorage (pour compatibilité et WebSocket)
    const token = getCookie('auth_token') || localStorage.getItem('token');
    
    if (token) {
        init.headers = {
            ...init.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    const res = await originalFetch(input, init);
    
    if (res.status === 401 && !input.toString().includes('/api/auth/')) {
        // Token expiré ou invalide - nettoyer les données locales et rediriger
        deleteCookie('auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
        
        // Retourne la réponse 401 sans lever d'exception pour éviter les boucles d'appels
        return res; 
    }
    
    return res;
};
