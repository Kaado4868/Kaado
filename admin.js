import { db, getCollectionRef, getLogCollectionRef } from './config.js';
import { doc, getDocs, updateDoc, setDoc, query, where, limit, orderBy, serverTimestamp, collection, addDoc, deleteDoc, onSnapshot, writeBatch } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { logAction, escapeHtml, formatMoney } from './utils.js';
import { visibleItems, allItems, startDataSync } from './inventory.js';

let debtsUnsubscribe = null;
let priceChart = null;

// --- MAIN TAB SWITCHER ---
export async function switchAdminTab(tab, storeName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'text-teal-600'));
    const btn = document.getElementById(`tab-${tab}`);
    if(btn) btn.classList.add('active', 'text-teal-600');
    
    ['stats','team','trash','tools','logs'].forEach(t => document.getElementById(`view-${t}`).classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    
    if (tab === 'trash') loadTrash(storeName);
    if (tab === 'logs') loadLogs(storeName);
    if (tab === 'stats') renderCharts();
    if (tab === 'team') renderStaffList();
    if (tab === 'tools') { /* Tools are static HTML, no load needed */ }
    if(window.lucide) lucide.createIcons();
}

// --- LOGS LOGIC ---
async function loadLogs(storeName) {
    const list = document.getElementById('logs-list');
    list.innerHTML = '<div class="text-center py-4">Loading...</div>';
    try {
        const q = query(getLogCollectionRef(storeName), orderBy('timestamp', 'desc'), limit(50));
        const snap = await getDocs(q);
        list.innerHTML = '';
        if(snap.empty) { list.innerHTML = '<div class="text-center text-zinc-400 text-sm">No logs found</div>'; return; }
        snap.forEach(d => {
            const log = d.data();
            const time = log.timestamp ? log.timestamp.toDate().toLocaleString() : 'N/A';
            list.innerHTML += `<div class="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700 text-sm shadow-sm">
                <div class="flex justify-between font-bold text-zinc-700 dark:text-zinc-200"><span>${log.action}</span><span class="text-[10px] text-zinc-400 font-normal">${time}</span></div>
                <div class="text-zinc-600 dark:text-zinc-400 mt-1">${log.details}</div>
                <div class="text-[10px] text-teal-500 dark:text-teal-400 mt-1 font-medium">${log.user}</div>
            </div>`;
        });
    } catch(e) { list.innerHTML = '<div class="text-rose-500 text-center text-sm">Error loading logs</div>'; }
}

// --- TOOLS: IMPORT/EXPORT ---
export function exportData() {
    const headers = "Name,Barcode,Price,CostPrice,Category,Bulk Deal\n";
    const rows = visibleItems.map(i => `"${i.name}","${i.barcode||''}","${i.price}","${i.costPrice||''}","${i.category||''}","${i.bulkPrice||''}"`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + headers + rows);
    link.download = "inventory.csv";
    link.click();
}

export function handleFileUpload(input, storeName) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const lines = e.target.result.split('\n');
        const batch = writeBatch(db);
        let count = 0;
        lines.forEach((line, idx) => {
            if(idx === 0 || !line.trim()) return; // Skip header
            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.trim().replace(/^"|"$/g, '')); // CSV Regex
            if(parts.length < 3) return;
            
            const data = {
                name: parts[0],
                barcode: parts[1] || '',
                price: parseFloat(parts[2]),
                costPrice: parseFloat(parts[3]) || 0, // NEW: Import Cost Price
                category: parts[4] || '',
                bulkPrice: parts[5] || '',
                isDeleted: false,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            };
            const newRef = doc(collection(getCollectionRef(storeName).firestore, getCollectionRef(storeName).path));
            batch.set(newRef, data);
            count++;
        });
        await batch.commit();
        alert(`Imported ${count} items!`);
        input.value = '';
    };
    reader.readAsText(file);
}

// --- TRASH LOGIC ---
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

// --- LEDGER LOGIC (Called from main.js now) ---
export function loadDebts(storeName) {
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

// --- TEAM LOGIC ---
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

// --- STATS LOGIC ---
export function renderCharts() {
    if(document.getElementById('stat-active-count')) {
        document.getElementById('stat-active-count').innerText = visibleItems.length;
        document.getElementById('stat-total-db').innerText = allItems.length;
    }
    if (priceChart) priceChart.destroy();
    const ranges = { '0-500': 0, '500-1k': 0, '1k-5k': 0, '5k+': 0 };
    visibleItems.forEach(i => {
        let p = parseFloat(i.price) || 0;
        if (p < 500) ranges['0-500']++; else if (p < 1000) ranges['500-1k']++; else if (p < 5000) ranges['1k-5k']++; else ranges['5k+']++;
    });
    const ctx = document.getElementById('priceChart');
    if(ctx) {
        priceChart = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(ranges), datasets: [{ label: 'Items', data: Object.values(ranges), backgroundColor: '#0d9488', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } } });
    }
}

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
    try { await batch.commit(); logAction(storeName, userEmail, "Bulk Update", `${type} ${val}% on all items`); alert("Update Complete!"); } catch(e) { alert("Error: " + e.message); }
        }
