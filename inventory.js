import { db, getCollectionRef } from './config.js';
import { query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { formatMoney, escapeHtml } from './utils.js';

export let visibleItems = [];
export let allItems = []; 
let unsubscribe = null;
let currentCategory = 'All';

// NEW: Pass isAdmin to sync logic
export function startDataSync(storeName, isManager) {
    if (unsubscribe) unsubscribe();
    
    document.getElementById('data-loading').classList.remove('hidden');
    
    const q = query(getCollectionRef(storeName), where('isDeleted', '==', false));
    
    unsubscribe = onSnapshot(q, (snapshot) => {
        document.getElementById('data-loading').classList.add('hidden');
        
        visibleItems = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        visibleItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        allItems = visibleItems;
        
        renderCategories();
        
        // Check if user is Admin to show cost price
        // (We check the global role badge or pass it down, checking window.isAdmin is easiest here)
        // Note: window.isAdmin is not set in this module, so we rely on the caller to handle UI, 
        // OR we simply render everything and hide via CSS.
        // Better approach: Rely on the render loop.
        renderList(isManager);
        
        if(document.getElementById('stat-active-count')) {
            document.getElementById('stat-active-count').innerText = visibleItems.length;
        }
    });
}

function renderCategories() {
    const cats = new Set(['All']);
    visibleItems.forEach(i => { if (i.category) cats.add(i.category.trim()); });
    
    const container = document.getElementById('category-container');
    container.innerHTML = '';
    
    cats.forEach(cat => {
        const btn = document.createElement('button');
        const isActive = cat === currentCategory;
        btn.className = `whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isActive ? 'bg-teal-600 text-white' : 'bg-white text-zinc-500 border-zinc-200'}`;
        btn.innerText = cat;
        btn.onclick = () => { currentCategory = cat; renderList(window.isManager); };
        container.appendChild(btn);
    });
}

export function renderList(isManager) {
    const term = document.getElementById('search-input').value.toLowerCase().trim();
    const listEl = document.getElementById('item-list');
    
    // Check if current user is admin (requires looking at DOM or global state)
    const isAdmin = document.getElementById('role-badge').innerText === 'ADMIN';

    const filtered = visibleItems.filter(item => {
        const text = (item.name + " " + (item.category||"")).toLowerCase();
        return text.includes(term) && (currentCategory === 'All' || item.category === currentCategory);
    });
    
    listEl.innerHTML = '';
    if (filtered.length === 0) { document.getElementById('empty-state').classList.remove('hidden'); return; }
    document.getElementById('empty-state').classList.add('hidden');
    
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = "item-card bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex justify-between items-center cursor-pointer group";
        
        const addBtn = `<button id="add-btn-${item.id}" onclick="CartManager.add(window.getItem('${item.id}')); event.stopPropagation()" class="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 transition-all flex items-center justify-center"><i data-lucide="plus" class="w-5 h-5"></i></button>`;
        const adminBtns = isManager ? `<div class="flex gap-2 items-center">${addBtn}<button onclick="window.editItem('${item.id}'); event.stopPropagation()" class="w-9 h-9 rounded-xl bg-zinc-50 text-zinc-400 hover:text-teal-600 border border-zinc-100 flex items-center justify-center"><i data-lucide="edit-2" class="w-4 h-4"></i></button><button onclick="window.softDeleteItem('${item.id}'); event.stopPropagation()" class="w-9 h-9 rounded-xl bg-zinc-50 text-zinc-400 hover:text-rose-500 border border-zinc-100 flex items-center justify-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>` : addBtn;
        
        // Show Cost Price only if Admin
        const costHtml = (isAdmin && item.costPrice) ? `<div class="text-[10px] text-purple-500 font-mono mt-1">Cost: ₦${formatMoney(item.costPrice)}</div>` : '';

        div.innerHTML = `<div class="flex-1 pr-3" ${isManager ? `onclick="window.editItem('${item.id}')"` : ''}><div class="font-bold text-zinc-900 dark:text-white text-base">${escapeHtml(item.name)}</div><div class="flex items-center gap-2"><div class="text-lg font-black text-zinc-900 dark:text-white">₦${formatMoney(item.price)}</div>${item.category ? `<span class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-md">${escapeHtml(item.category)}</span>` : ''}</div>${costHtml}</div>${adminBtns}`;
        listEl.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}
