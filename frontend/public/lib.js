export const API = 'http://localhost:8000/api';
export const WS_URL = 'ws://localhost:8000/ws';

export const $ = (id) => document.getElementById(id);

export const isLoggedIn = () => !!localStorage.getItem('user');
export const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');

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

export const readImgB64 = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
});

export const fmtDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const catIcon = (cat) => {
    const icons = { 'Matériel': '🛠️', 'Livres': '📚', 'Services': '🤝', 'Sport': '⚽', 'Autre': '📦' };
    return icons[cat] || '📦';
};

export const catBadge = (cat) => `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-100">${cat}</span>`;

export const qBadge = (q) => {
    const colors = { 'new': 'bg-blue-50 text-blue-700 border-blue-100', 'good': 'bg-emerald-50 text-emerald-700 border-emerald-100', 'fair': 'bg-orange-50 text-orange-700 border-orange-100' };
    return `<span class="${colors[q] || colors.good} text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border">${q}</span>`;
};

export const stars = (rating, count) => `
    <div class="flex items-center gap-1">
        <div class="flex text-orange-400 text-[10px]">
            ${'★'.repeat(Math.round(rating || 0))}${'☆'.repeat(5 - Math.round(rating || 0))}
        </div>
        <span class="text-[10px] text-gray-400 font-bold">(${count || 0})</span>
    </div>
`;

export const dispoBadge = (from, until, status) => {
    if (status !== 'available') return `<span class="bg-orange-50 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-orange-100">${status === 'reserved' ? 'Réservé' : 'Prêté'}</span>`;
    return `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-100">Disponible</span>`;
};

export const showModal = (id) => $(id)?.classList.remove('hidden');
export const hideModal = (id) => $(id)?.classList.add('hidden');
