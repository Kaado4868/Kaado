import { db, getCollectionRef, getLogCollectionRef } from './config.js';
import { doc, getDocs, updateDoc, setDoc, query, where, limit, orderBy, serverTimestamp, collection, addDoc, deleteDoc, onSnapshot, writeBatch, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { logAction, escapeHtml, formatMoney } from './utils.js';
import { visibleItems, allItems } from './inventory.js';

let debtsUnsubscribe = null;
let priceChart = null;

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
    if(window.lucide) lucide.createIcons();
}

// --- COMPLEX LEDGER LOGIC ---
export function loadDebts(storeName) {
    if(debtsUnsubscribe) debtsUnsubscribe();
    const safeName = storeName.replace(/[^a-z0-9]/gi, '').toLowerCase(); 
    const debtRef = collection(db, 'artifacts', 'cipher-e6c22', 'public', 'data', `pk_store_${safeName}_debts`);
    
    // Suggest names for autocomplete
    const datalist = document.getElementById('debtor-list');
    
    debtsUnsubscribe = onSnapshot(query(debtRef, orderBy('updatedAt', 'desc')), (snap) => {
        const list = document.getElementById('debt-list');
        list.innerHTML = '';
        datalist.innerHTML = '';
        let total = 0;
        
        if(snap.empty) { list.innerHTML = '<div class="text-center text-zinc-400 text-sm">No active debts</div>'; }
        
        snap.forEach(d => {
            const data = d.data();
            total += data.amount;
            
            // Add to autocomplete
            const opt = document.createElement('option');
            opt.value = data.name;
            datalist.appendChild(opt);

            // Render Card with History Toggle
            const div = document.createElement('div');
            div.className = "bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm";
            
            // Generate history HTML
            let historyHtml = '';
            if(data.history) {
                historyHtml = data.history.slice(0, 3).map(h => 
                    `<div class="text-[10px] flex justify-between items-center mt-1 debt-history-item ${h.type === 'payment' ? 'paid' : 'owed'}">
                        <span class="text-zinc-500">${h.desc}</span>
                        <span class="${h.type === 'payment' ? 'text-emerald-500' : 'text-rose-500'} font-bold">${h.type === 'payment' ? '-' : '+'}₦${formatMoney(h.amount)}</span>
                    </div>`
                ).join('');
            }

            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="font-bold text-zinc-800 dark:text-white text-lg leading-none">${escapeHtml(data.name)}</div>
                        <div class="text-[10px] text-zinc-400 mt-1">Last update: ${data.updatedAt ? data.updatedAt.toDate().toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-black text-rose-500">₦${formatMoney(data.amount)}</div>
                    </div>
                </div>
                <div class="mb-3">${historyHtml}</div>
                <div class="flex gap-2">
                    <button onclick="window.payDebt('${d.id}', '${escapeHtml(data.name)}', ${data.amount})" class="flex-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 py-2 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-800">Repay</button>
                    <button onclick="window.addMoreDebt('${d.id}', '${escapeHtml(data.name)}')" class="flex-1 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 py-2 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-600">Add More</button>
                </div>
            `;
            list.appendChild(div);
        });
        document.getElementById('total-debt').innerText = `Total: ₦${formatMoney(total)}`;
    });
}

export async function processDebt(storeName, userEmail, name, itemsDesc, amount, isPayment, existingId = null) {
    const safeName = storeName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const debtRef = collection(db, 'artifacts', 'cipher-e6c22', 'public', 'data', `pk_store_${safeName}_debts`);
    const amt = parseFloat(amount);
    const entry = {
        type: isPayment ? 'payment' : 'debt',
        amount: amt,
        desc: itemsDesc || (isPayment ? 'Payment' : 'Items'),
        date: new Date().toISOString()
    };

    if (existingId) {
        // Update existing doc
        const docRef = doc(debtRef, existingId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return;
        
        const oldData = snapshot.data();
        let newHistory = [entry, ...(oldData.history || [])];
        let newBalance = oldData.amount + (isPayment ? -amt : amt);
        
        if (newBalance <= 0 && isPayment) {
            await deleteDoc(docRef); // Settle completely
        } else {
            await updateDoc(docRef, { amount: newBalance, history: newHistory, updatedAt: serverTimestamp() });
        }
    } else {
        // Create new
        // First check if name exists to avoid duplicates
        const q = query(debtRef, where('name', '==', name));
        const match = await getDocs(q);
        if(!match.empty) {
            // Recurse to update existing
            return processDebt(storeName, userEmail, name, itemsDesc, amount, isPayment, match.docs[0].id);
        }
        await addDoc(debtRef, { 
            name, 
            amount: amt, 
            history: [entry], 
            createdAt: serverTimestamp(), 
            updatedAt: serverTimestamp() 
        });
    }
}

// --- OTHER ADMIN FUNCTIONS ---
async function loadLogs(storeName) {
    const list = document.getElementById('logs-list');
    list.innerHTML = '<div class="text-center py-4">Loading...</div>';
    const q = query(getLogCollectionRef(storeName), orderBy('timestamp', 'desc'), limit(50));
    try {
        const snap = await getDocs(q);
        list.innerHTML = '';
        snap.forEach(d => {
            const log = d.data();
            const time = log.timestamp ? log.timestamp.toDate().toLocaleString() : 'N/A';
            list.innerHTML += `<div class="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700 text-sm shadow-sm mb-2"><div class="flex justify-between font-bold text-zinc-700 dark:text-zinc-200"><span>${log.action}</span><span class="text-[10px] text-zinc-400 font-normal">${time}</span></div><div class="text-zinc-600 dark:text-zinc-400 mt-1">${log.details}</div><div class="text-[10px] text-teal-500 font-medium">${log.user}</div></div>`;
        });
    } catch(e) {}
}

export function renderStaffList() {
    const list = document.getElementById('staff-list');
    list.innerHTML = '';
    const staffMap = window.staffMap || {};
    if (Object.keys(staffMap).length === 0) list.innerHTML = '<div class="text-center text-zinc-400 text-sm">No staff added yet.</div>';
    Object.entries(staffMap).forEach(([email, data]) => {
        const role = (typeof data === 'object') ? data.role : data;
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white dark:bg-zinc-700 p-3 rounded-lg border border-zinc-100 dark:border-zinc-600";
        div.innerHTML = `<div><div class="font-bold text-zinc-800 dark:text-white text-sm">${escapeHtml(email)}</div><div class="text-xs text-teal-500 uppercase font-bold">${role}</div></div><button onclick="window.removeStaff('${email}')" class="text-rose-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

export async function addStaff(storeName, email, role) {
    const currentStaff = window.staffMap || {};
    currentStaff[email.toLowerCase()] = { role: role, username: email.split('@')[0] };
    await setDoc(doc(getCollectionRef(storeName), '_config'), { staff: currentStaff }, { merge: true });
}

export async function removeStaff(storeName, email) {
    if(!confirm(`Remove ${email}?`)) return;
    const currentStaff = window.staffMap || {};
    delete currentStaff[email];
    await setDoc(doc(getCollectionRef(storeName), '_config'), { staff: currentStaff }, { merge: true });
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

// TRASH
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

// STATS
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
            if(idx === 0 || !line.trim()) return;
            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.trim().replace(/^"|"$/g, ''));
            if(parts.length < 3) return;
            const data = {
                name: parts[0],
                barcode: parts[1] || '',
                price: parseFloat(parts[2]),
                costPrice: parseFloat(parts[3]) || 0,
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
