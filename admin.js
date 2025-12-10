import { db, getCollectionRef } from './config.js';
import { doc, getDocs, updateDoc, setDoc, query, where, limit, orderBy, serverTimestamp, collection, addDoc, deleteDoc, onSnapshot, writeBatch } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { logAction, escapeHtml, formatMoney } from './utils.js';
import { visibleItems, allItems } from './inventory.js';

let debtsUnsubscribe = null;
let priceChart = null;

// --- MAIN TAB SWITCHER ---
export async function switchAdminTab(tab, storeName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'text-teal-600'));
    const btn = document.getElementById(`tab-${tab}`);
    if(btn) btn.classList.add('active', 'text-teal-600');
    
    ['stats','team','trash','tools','ledger'].forEach(t => document.getElementById(`view-${t}`).classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    
    if (tab === 'trash') loadTrash(storeName);
    if (tab === 'ledger') loadDebts(storeName);
    if (tab === 'stats') renderCharts();
    if (tab === 'team') renderStaffList();
    if(window.lucide) lucide.createIcons();
}

// --- 1. TRASH LOGIC ---
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

// --- 2. LEDGER (DEBT) LOGIC ---
function loadDebts(storeName) {
    if(debtsUnsubscribe) debtsUnsubscribe();
    const safeName = storeName.replace(/[^a-z0-9]/gi, '').toLowerCase(); 
    const debtRef = collection(db, 'artifacts', 'cipher-e6c22', 'public', 'data', `pk_store_${safeName}_debts`);
    
    debtsUnsubscribe = onSnapshot(query(debtRef, orderBy('createdAt', 'desc')), (snap) => {
        const list = document.getElementById('debt-list');
        list.innerHTML = '';
        let total = 0;
        
        if(snap.empty) { list.innerHTML = '<div class="text-center text-zinc-400 text-sm">No active debts</div>'; }
        
        snap.forEach(d => {
            const data = d.data();
            total += data.amount;
            const div = document.createElement('div');
            div.className = "bg-white dark:bg-zinc-700 p-3 rounded-lg border border-zinc-100 dark:border-zinc-600 flex justify-between items-center";
            div.innerHTML = `<div><div class="font-bold text-zinc-800 dark:text-white">${escapeHtml(data.name)}</div><div class="text-xs text-rose-500 font-bold">₦${formatMoney(data.amount)}</div></div><button onclick="window.deleteDebt('${d.id}')" class="text-teal-500 text-xs font-bold border border-teal-500 rounded px-2 py-1">Settle</button>`;
            list.appendChild(div);
        });
        document.getElementById('total-debt').innerText = `Total: ₦${formatMoney(total)}`;
    });
}

export async function addDebt(storeName, name, amount) {
    const safeName = storeName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const debtRef = collection(db, 'artifacts', 'cipher-e6c22', 'public', 'data', `pk_store_${safeName}_debts`);
    await addDoc(debtRef, { name, amount: parseFloat(amount), createdAt: serverTimestamp(), status: 'unpaid' });
}

export async function deleteDebt(storeName, id) {
    if(!confirm("Settle this debt?")) return;
    const safeName = storeName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    await deleteDoc(doc(db, 'artifacts', 'cipher-e6c22', 'public', 'data', `pk_store_${safeName}_debts`, id));
}

// --- 3. TEAM LOGIC ---
export function renderStaffList() {
    const list = document.getElementById('staff-list');
    list.innerHTML = '';
    const staffMap = window.staffMap || {};
    
    if (Object.keys(staffMap).length === 0) list.innerHTML = '<div class="text-center text-zinc-400 text-sm">No staff added yet.</div>';
    
    Object.entries(staffMap).forEach(([email, role]) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white dark:bg-zinc-700 p-3 rounded-lg border border-zinc-100 dark:border-zinc-600";
        div.innerHTML = `<div><div class="font-bold text-zinc-800 dark:text-white text-sm">${escapeHtml(email)}</div><div class="text-xs text-teal-500 uppercase font-bold">${role}</div></div><button onclick="window.removeStaff('${email}')" class="text-rose-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

export async function addStaff(storeName, email, role) {
    const currentStaff = window.staffMap || {};
    currentStaff[email.toLowerCase()] = role;
    await setDoc(doc(getCollectionRef(storeName), '_config'), { staff: currentStaff }, { merge: true });
}

export async function removeStaff(storeName, email) {
    if(!confirm(`Remove ${email}?`)) return;
    const currentStaff = window.staffMap || {};
    delete currentStaff[email];
    await setDoc(doc(getCollectionRef(storeName), '_config'), { staff: currentStaff }, { merge: true });
}

// --- 4. STATS LOGIC ---
export function renderCharts() {
    if(document.getElementById('stat-active-count')) {
        document.getElementById('stat-active-count').innerText = visibleItems.length;
        document.getElementById('stat-total-db').innerText = allItems.length;
    }

    if (priceChart) priceChart.destroy();
    const ranges = { '0-500': 0, '500-1k': 0, '1k-5k': 0, '5k+': 0 };
    visibleItems.forEach(i => {
        let p = parseFloat(i.price) || 0;
        if (p < 500) ranges['0-500']++;
        else if (p < 1000) ranges['500-1k']++;
        else if (p < 5000) ranges['1k-5k']++;
        else ranges['5k+']++;
    });

    const ctx = document.getElementById('priceChart');
    if(ctx) {
        priceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(ranges),
                datasets: [{ label: 'Items', data: Object.values(ranges), backgroundColor: '#0d9488', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } }
        });
    }
}

// --- 5. BULK TOOLS LOGIC ---
export async function applyBulkUpdate(storeName, userEmail, type, pct) {
    const val = parseFloat(pct);
    if(isNaN(val) || val === 0) return alert("Enter percentage");
    if(!confirm(`Apply ${type} of ${val}% to ALL items?`)) return;

    const batch = writeBatch(db);
    visibleItems.slice(0, 450).forEach(item => { 
        let oldPrice = parseFloat(item.price) || 0;
        let newPrice = type === 'increase' ? Math.ceil(oldPrice * (1 + (val / 100))) : Math.floor(oldPrice * (1 - (val / 100)));
        batch.update(doc(getCollectionRef(storeName), item.id), { price: newPrice, updatedAt: serverTimestamp() }); 
    });
    
    try {
        await batch.commit();
        logAction(storeName, userEmail, "Bulk Update", `${type} ${val}% on all items`);
        alert("Update Complete!");
    } catch(e) { alert("Error: " + e.message); }
        }
