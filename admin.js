import { db, getCollectionRef } from './config.js';
import { doc, getDocs, updateDoc, setDoc, query, where, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { logAction, escapeHtml } from './utils.js';
import { visibleItems } from './inventory.js';

export async function switchAdminTab(tab, storeName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'text-teal-600'));
    const btn = document.getElementById(`tab-${tab}`);
    if(btn) btn.classList.add('active', 'text-teal-600');
    
    ['stats','team','trash','tools'].forEach(t => document.getElementById(`view-${t}`).classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    
    if (tab === 'trash') loadTrash(storeName);
}

// Trash Logic
async function loadTrash(storeName) {
    const list = document.getElementById('trash-list');
    list.innerHTML = '<div class="text-center py-4">Loading...</div>';
    
    const q = query(getCollectionRef(storeName), where('isDeleted', '==', true), limit(50));
    const snap = await getDocs(q);
    
    list.innerHTML = '';
    if(snap.empty) { list.innerHTML = '<div class="text-center text-zinc-400 text-sm">Bin Empty</div>'; return; }
    
    snap.forEach(d => {
        const item = {id: d.id, ...d.data()};
        list.innerHTML += `<div class="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-rose-100 dark:border-rose-900 flex justify-between items-center shadow-sm"><div><div class="font-bold text-zinc-800 dark:text-white">${escapeHtml(item.name)}</div></div><button onclick="window.restoreItem('${item.id}')" class="bg-teal-50 text-teal-600 px-3 py-1.5 rounded-lg text-xs font-bold">Restore</button></div>`;
    });
}

export async function softDeleteItem(id, storeName, userEmail) {
    if (!confirm("Move to Trash?")) return;
    try {
        await updateDoc(doc(getCollectionRef(storeName), id), { isDeleted: true, updatedAt: serverTimestamp() });
        logAction(storeName, userEmail, "Soft Delete", `Deleted item ${id}`);
    } catch(e) { alert("Error deleting item"); }
}

export async function restoreItem(id, storeName, userEmail) {
    try {
        await updateDoc(doc(getCollectionRef(storeName), id), { isDeleted: false, updatedAt: serverTimestamp() });
        logAction(storeName, userEmail, "Restore", `Restored item ${id}`);
        loadTrash(storeName);
    } catch(e) { alert("Error restoring item"); }
}

// Config/Categories Logic
export async function loadConfig(storeName, isSuperAdmin, currentUser, callback) {
    // Basic implementation of the listener you had before
    // We export this logic so main.js can call it
}
