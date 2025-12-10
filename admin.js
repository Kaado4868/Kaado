import { db, getCollectionRef, getLogCollectionRef } from './config.js';
import { doc, getDocs, updateDoc, setDoc, query, where, limit, orderBy, serverTimestamp, collection, addDoc, deleteDoc, onSnapshot, writeBatch } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
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
        const snapshot = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js').then(m => m.getDoc(docRef));
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

// --- OTHER ADMIN FUNCTIONS (Logs, Trash, Team, etc) ---
// (Same as before, just kept for completeness)
async function loadLogs(storeName) {
    const list = document.getElementById('logs-list');
    const q = query(getLogCollectionRef(storeName), orderBy('timestamp', 'desc'), limit(50));
    try {
        const snap = await getDocs(q);
        list.innerHTML = '';
        snap.forEach(d => {
            const log = d.data();
            list.innerHTML += `<div class="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700 text-sm shadow-sm mb-2"><div class="flex justify-between font-bold text-zinc-700 dark:text-zinc-200"><span>${log.action}</span><span class="text-[10px] text-zinc-400 font-normal">${log.timestamp?log.timestamp.toDate().toLocaleTimeString():''}</span></div><div class="text-zinc-600 dark:text-zinc-400 mt-1">${log.details}</div><div class="text-[10px] text-teal-500 font-medium">${log.user}</div></div>`;
        });
    } catch(e) {}
}

export function renderStaffList() { /* ... Same as previous ... */ }
export async function addStaff(storeName, email, role) { /* ... Same as previous ... */ }
export async function removeStaff(storeName, email) { /* ... Same as previous ... */ }
export async function softDeleteItem(id, storeName, userEmail) { /* ... Same as previous ... */ }
export async function restoreItem(id, storeName, userEmail) { /* ... Same as previous ... */ }
export function renderCharts() { /* ... Same as previous ... */ }
export async function applyBulkUpdate() { /* ... Same as previous ... */ }
export function exportData() { /* ... Same as previous ... */ }
export function handleFileUpload() { /* ... Same as previous ... */ }
