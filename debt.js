import { db, getCollectionRef, formatMoney, userDisplayName } from './core.js';
import { collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp, runTransaction } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

let debtors = [];
let selectedDebtorId = null;

export function initDebt() {
    // Listen to Debtors Sub-collection (Better for performance than one huge doc)
    const debtRef = collection(getCollectionRef(), 'debtors');
    onSnapshot(debtRef, (snap) => {
        debtors = snap.docs.map(d => ({id: d.id, ...d.data()}));
        window.renderDebtors();
    });
}

window.toggleDebt = () => {
    document.getElementById('debt-modal').classList.remove('hidden');
    initDebt();
    window.switchDebtTab('list');
};

window.switchDebtTab = (tab) => {
    document.getElementById('dt-list').className = tab === 'list' ? "flex-1 py-4 font-bold text-sm border-b-2 border-orange-500 text-orange-600" : "flex-1 py-4 font-bold text-sm text-zinc-400";
    document.getElementById('dt-add').className = tab === 'add' ? "flex-1 py-4 font-bold text-sm border-b-2 border-orange-500 text-orange-600" : "flex-1 py-4 font-bold text-sm text-zinc-400";
    document.getElementById('debt-content-list').className = tab === 'list' ? "flex-1 overflow-y-auto p-4 bg-zinc-50" : "hidden";
    document.getElementById('debt-content-add').className = tab === 'add' ? "flex-1 overflow-y-auto p-6" : "hidden";
};

window.renderDebtors = () => {
    const list = document.getElementById('debtor-list');
    const term = document.getElementById('debt-search').value.toLowerCase();
    list.innerHTML = '';

    const filtered = debtors.filter(d => d.name.toLowerCase().includes(term) && d.currentBalance > 0);

    filtered.forEach(d => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-xl shadow-sm border border-zinc-200 flex justify-between items-center cursor-pointer hover:border-orange-300";
        div.onclick = () => window.openDebtDetail(d.id);
        div.innerHTML = `
            <div>
                <div class="font-bold">${d.name}</div>
                <div class="text-xs text-zinc-500">Last update: ${d.lastUpdated ? new Date(d.lastUpdated.toDate()).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div class="font-black text-rose-600">₦${formatMoney(d.currentBalance)}</div>
        `;
        list.appendChild(div);
    });
};

window.saveDebt = async () => {
    const name = document.getElementById('debt-name').value.trim();
    const amount = parseFloat(document.getElementById('debt-amount').value);
    const items = document.getElementById('debt-items').value.trim();
    
    if(!name || !amount) return alert("Name and Amount required");

    // Check if debtor exists
    const existing = debtors.find(d => d.name.toLowerCase() === name.toLowerCase());
    
    const entry = {
        type: 'debt',
        amount: amount,
        items: items || 'Manual Entry',
        date: new Date().toISOString(),
        staff: userDisplayName
    };

    try {
        if(existing) {
            // Add to Existing
            const ref = doc(getCollectionRef(), 'debtors', existing.id);
            await updateDoc(ref, {
                currentBalance: existing.currentBalance + amount,
                history: arrayUnion(entry),
                lastUpdated: serverTimestamp()
            });
            alert(`Updated ${existing.name}'s balance.`);
        } else {
            // Create New
            await addDoc(collection(getCollectionRef(), 'debtors'), {
                name: name,
                currentBalance: amount,
                history: [entry],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
            alert("New debtor recorded.");
        }
        document.getElementById('debt-name').value = '';
        document.getElementById('debt-amount').value = '';
        document.getElementById('debt-items').value = '';
        window.switchDebtTab('list');
    } catch(e) { alert("Error: " + e.message); }
};

window.openDebtDetail = (id) => {
    const d = debtors.find(i => i.id === id);
    if(!d) return;
    selectedDebtorId = id;
    
    document.getElementById('debt-detail-modal').classList.remove('hidden');
    document.getElementById('dd-name').innerText = d.name;
    document.getElementById('dd-balance').innerText = `₦${formatMoney(d.currentBalance)}`;
    
    const histDiv = document.getElementById('dd-history');
    histDiv.innerHTML = '';
    
    // Sort history new to old
    const sorted = [...(d.history || [])].reverse();
    
    sorted.forEach(h => {
        const isPay = h.type === 'payment';
        histDiv.innerHTML += `
            <div class="flex justify-between items-start py-2 border-b border-zinc-50 last:border-0">
                <div>
                    <div class="font-bold ${isPay ? 'text-teal-600' : 'text-zinc-700'}">${isPay ? 'Payment Received' : 'Debt Added'}</div>
                    <div class="text-xs text-zinc-400">${new Date(h.date).toLocaleString()} • by ${h.staff || 'Staff'}</div>
                    ${h.items ? `<div class="text-xs text-zinc-500 mt-1 italic">"${h.items}"</div>` : ''}
                </div>
                <div class="font-bold ${isPay ? 'text-teal-600' : 'text-rose-600'}">${isPay ? '-' : '+'}₦${formatMoney(h.amount)}</div>
            </div>
        `;
    });
};

window.processRepayment = async () => {
    const amount = parseFloat(document.getElementById('repay-amount').value);
    if(!amount || !selectedDebtorId) return;
    
    const d = debtors.find(i => i.id === selectedDebtorId);
    if(amount > d.currentBalance) return alert("Amount exceeds debt!");

    const entry = {
        type: 'payment',
        amount: amount,
        date: new Date().toISOString(),
        staff: userDisplayName
    };

    try {
        const ref = doc(getCollectionRef(), 'debtors', selectedDebtorId);
        await updateDoc(ref, {
            currentBalance: d.currentBalance - amount,
            history: arrayUnion(entry),
            lastUpdated: serverTimestamp()
        });
        document.getElementById('repay-amount').value = '';
        document.getElementById('debt-detail-modal').classList.add('hidden');
        alert("Payment Recorded!");
    } catch(e) { alert(e.message); }
};
