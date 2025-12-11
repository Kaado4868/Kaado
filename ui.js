import { allItems, userRole, userDisplayName, formatMoney, getCollectionRef, currentUser, db } from './core.js';
import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

export function showLogin() {
    document.getElementById('loading-screen')?.classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
    
    document.getElementById('login-btn').onclick = () => {
        const name = document.getElementById('store-name-input').value.trim().toUpperCase();
        if(name.length < 2) return alert("Enter Store ID");
        localStorage.setItem('pk_store_name', name);
        window.location.reload(); 
    };
}

export function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('username-modal').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    if(window.lucide) lucide.createIcons();
}

export function showUsernameModal() {
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('username-modal').classList.remove('hidden');
}

export function updateUI() {
    document.getElementById('role-badge').innerText = userRole.replace('_', ' ').toUpperCase();
    document.getElementById('user-name-display').innerText = userDisplayName;

    // Show Admin Tools if Admin or Super Admin
    if (['admin', 'super_admin'].includes(userRole)) {
        document.getElementById('admin-btn').classList.remove('hidden');
        document.getElementById('cost-price-container').classList.remove('hidden');
    }
}

window.renderList = () => {
    const list = document.getElementById('item-list');
    const term = document.getElementById('search-input').value.toLowerCase();
    list.innerHTML = '';
    
    const filtered = allItems.filter(i => (i.name + i.barcode).toLowerCase().includes(term));
    
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex justify-between items-center";
        
        let actions = `<button onclick="window.addToCart('${item.id}')" class="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center"><i data-lucide="plus"></i></button>`;
        
        if(['manager', 'admin', 'super_admin'].includes(userRole)) {
            actions = `<div class="flex gap-2">
                ${actions}
                <button onclick="window.editItem('${item.id}')" class="w-10 h-10 bg-zinc-100 text-zinc-400 rounded-xl flex items-center justify-center"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
            </div>`;
        }

        // Only Admins see Cost Price in the list (optional, maybe just in edit)
        const costDisplay = ['admin', 'super_admin'].includes(userRole) && item.costPrice 
            ? `<div class="text-[10px] text-amber-500">CP: ₦${item.costPrice}</div>` : '';

        div.innerHTML = `
            <div>
                <div class="font-bold text-zinc-900 dark:text-white">${item.name}</div>
                <div class="text-xs text-zinc-500">${item.category || ''}</div>
                <div class="font-black text-lg mt-1">₦${formatMoney(item.price)}</div>
                ${costDisplay}
            </div>
            ${actions}
        `;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
};

window.editItem = (id) => {
    const item = allItems.find(i => i.id === id);
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal-title').innerText = "Edit Item";
    document.getElementById('item-id').value = id;
    document.getElementById('name-input').value = item.name;
    document.getElementById('price-input').value = item.price;
    document.getElementById('barcode-input').value = item.barcode || '';
    
    // Admin Cost Price
    if(['admin', 'super_admin'].includes(userRole)) {
        document.getElementById('cost-price-input').value = item.costPrice || '';
    }
};

window.openItemModal = () => {
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('item-form').reset();
    document.getElementById('item-id').value = '';
};

// Form Handler
document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const data = {
        name: document.getElementById('name-input').value,
        price: parseFloat(document.getElementById('price-input').value),
        barcode: document.getElementById('barcode-input').value,
        category: document.getElementById('category-input').value,
        updatedAt: serverTimestamp()
    };

    // Only save Cost Price if allowed
    if(['admin', 'super_admin'].includes(userRole)) {
        data.costPrice = parseFloat(document.getElementById('cost-price-input').value) || 0;
    }

    const ref = id ? doc(getCollectionRef(), id) : doc(getCollectionRef());
    if(!id) data.createdAt = serverTimestamp();
    
    await setDoc(ref, data, { merge: true });
    document.getElementById('modal').classList.add('hidden');
});

// Search Listener
document.getElementById('search-input').addEventListener('input', window.renderList);
