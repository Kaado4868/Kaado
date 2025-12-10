import { auth, SUPER_ADMIN_EMAIL, getCollectionRef } from './config.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, collection } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { startDataSync, renderList, visibleItems } from './inventory.js';
import { CartManager } from './cart.js';
import { switchAdminTab, softDeleteItem, restoreItem, processDebt, addStaff, removeStaff, applyBulkUpdate, loadDebts, exportData, handleFileUpload } from './admin.js';

let currentStoreName = localStorage.getItem('pk_store_name');
let currentUser = null;
let isAdmin = false;
let isManager = false;

window.CartManager = CartManager;
window.logout = () => { if(confirm("Log out?")) { localStorage.removeItem('pk_store_name'); signOut(auth); } };
window.toggleDarkMode = () => { document.documentElement.classList.toggle('dark'); };

// ADMIN & LEDGER
window.openSuperAdmin = () => { if(isAdmin) { document.getElementById('admin-modal').classList.remove('hidden'); switchAdminTab('stats', currentStoreName); } };
window.openLedger = () => { if(isManager || isAdmin) { document.getElementById('ledger-modal').classList.remove('hidden'); loadDebts(currentStoreName); } };

window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
window.switchAdminTab = (tab) => switchAdminTab(tab, currentStoreName);
window.softDeleteItem = (id) => softDeleteItem(id, currentStoreName, currentUser.email);
window.restoreItem = (id) => restoreItem(id, currentStoreName, currentUser.email);
window.getItem = (id) => visibleItems.find(i => i.id === id);
window.removeStaff = (email) => removeStaff(currentStoreName, email);
window.applyBulkUpdate = (type) => applyBulkUpdate(currentStoreName, currentUser.email, type, document.getElementById('inflation-input').value);
window.exportData = () => exportData();
window.handleFileUpload = (input) => handleFileUpload(input, currentStoreName);

// --- NEW DEBT FUNCTIONS ---
window.payDebt = (id, name, currentAmount) => {
    const amount = prompt(`Repay debt for ${name}.\nCurrent Owed: ₦${currentAmount}\n\nEnter amount to pay:`);
    if(amount) processDebt(currentStoreName, currentUser.email, name, "Partial Repayment", amount, true, id);
};
window.addMoreDebt = (id, name) => {
    const amount = prompt(`Add to ${name}'s debt.\nEnter amount:`);
    const desc = prompt("What items?");
    if(amount) processDebt(currentStoreName, currentUser.email, name, desc || "Additional items", amount, false, id);
};

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
    document.getElementById('loading-overlay').classList.add('hidden');
    if (user && currentStoreName) {
        currentUser = user;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        document.getElementById('welcome-msg').innerText = `Welcome, ${user.displayName || 'User'}`;
        checkPermissions();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        if(currentStoreName) document.getElementById('store-name-input').value = currentStoreName;
    }
});

function checkPermissions() {
    const configRef = doc(getCollectionRef(currentStoreName), '_config');
    onSnapshot(configRef, (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            window.storeCategories = data.categories || ['General']; 
            window.staffMap = data.staff || {}; 

            // USERNAME CHECK
            const myData = window.staffMap[currentUser.email.toLowerCase()];
            const isSuperAdmin = (currentUser.email === SUPER_ADMIN_EMAIL.toLowerCase());
            
            if (!isSuperAdmin && !myData) { alert("Access Denied"); signOut(auth); return; }
            
            // Force Username Creation
            if (!myData || !myData.username) {
                document.getElementById('username-modal').classList.remove('hidden');
                // Handle submission
                document.getElementById('username-form').onsubmit = (e) => {
                    e.preventDefault();
                    const name = document.getElementById('username-input').value.trim();
                    if(name.length < 3) return;
                    // Update staff object with new username
                    const updatedStaff = {...window.staffMap};
                    if(!updatedStaff[currentUser.email.toLowerCase()]) updatedStaff[currentUser.email.toLowerCase()] = { role: 'staff' }; // Init if missing
                    
                    // If stored as object vs string, handle both
                    if (typeof updatedStaff[currentUser.email.toLowerCase()] === 'string') {
                        updatedStaff[currentUser.email.toLowerCase()] = { role: updatedStaff[currentUser.email.toLowerCase()], username: name };
                    } else {
                        updatedStaff[currentUser.email.toLowerCase()].username = name;
                    }
                    
                    updateDoc(configRef, { staff: updatedStaff });
                    document.getElementById('username-modal').classList.add('hidden');
                };
            }

            // ROLES
            const role = (typeof myData === 'object') ? myData.role : myData;
            isAdmin = isSuperAdmin || role === 'admin';
            isManager = isAdmin || role === 'manager';
            
            startDataSync(currentStoreName, isManager);
            CartManager.init(currentStoreName, currentUser);
            
            // GOLDEN MODE
            const roleBadge = document.getElementById('role-badge');
            if (isAdmin) {
                roleBadge.innerText = "ADMINISTRATOR";
                roleBadge.className = "text-[10px] font-black uppercase tracking-wider mt-0.5 text-gold glow-gold";
                document.getElementById('super-admin-btn').classList.remove('hidden');
                // Make Header Icons Gold
                document.querySelectorAll('#app-screen .max-w-xl .flex button').forEach(b => b.classList.add('text-gold'));
            } else {
                roleBadge.innerText = isManager ? "MANAGER" : "STAFF";
                roleBadge.className = "text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5";
            }
            if(isManager) document.getElementById('ledger-btn').classList.remove('hidden');
            
        } else if (currentUser.email === SUPER_ADMIN_EMAIL.toLowerCase()) {
            setDoc(configRef, { staff: {}, categories: ['General'] });
        }
    });
}

// ... (Rest of Form Listeners: login, item-form, search - same as before) ...
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('store-name-input').value.toUpperCase();
    if(name.length < 2) return alert("Invalid Name");
    localStorage.setItem('pk_store_name', name);
    currentStoreName = name;
    document.getElementById('loading-overlay').classList.remove('hidden');
    signInWithPopup(auth, new GoogleAuthProvider()).catch(error => {
        document.getElementById('loading-overlay').classList.add('hidden');
        alert("Login Failed: " + error.message);
    });
});

document.getElementById('search-input').addEventListener('input', () => renderList(isManager));

window.openItemModal = () => { 
    document.getElementById('modal').classList.remove('hidden'); 
    document.getElementById('item-form').reset(); 
    document.getElementById('item-id').value = '';
    // Toggle Cost Price
    if(isAdmin) document.getElementById('cost-price-container').classList.remove('hidden');
    else document.getElementById('cost-price-container').classList.add('hidden');
    
    const sel = document.getElementById('category-input');
    sel.innerHTML = '';
    (window.storeCategories||['General']).forEach(c => { const o = document.createElement('option'); o.innerText=c; sel.appendChild(o); });
};

window.editItem = (id) => {
    if(!isManager) return;
    const item = visibleItems.find(i => i.id === id);
    window.openItemModal();
    document.getElementById('item-id').value = item.id;
    document.getElementById('name-input').value = item.name;
    document.getElementById('price-input').value = item.price;
    document.getElementById('bulk-input').value = item.bulkPrice || '';
    if(isAdmin) document.getElementById('cost-input').value = item.costPrice || '';
    document.getElementById('category-input').value = item.category || 'General';
};

document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!isManager) return;
    const id = document.getElementById('item-id').value;
    const data = {
        name: document.getElementById('name-input').value.trim(),
        price: parseFloat(document.getElementById('price-input').value),
        bulkPrice: document.getElementById('bulk-input').value.trim(),
        category: document.getElementById('category-input').value,
        barcode: document.getElementById('barcode-input').value.trim(),
        isDeleted: false,
        updatedAt: serverTimestamp()
    };
    if(isAdmin) data.costPrice = parseFloat(document.getElementById('cost-input').value) || 0;
    
    const ref = getCollectionRef(currentStoreName);
    try {
        if(id) { await updateDoc(doc(ref, id), data); } 
        else { data.createdAt = serverTimestamp(); await setDoc(doc(collection(ref.firestore, ref.path)), data); }
        window.closeModal('modal');
    } catch(e) { alert("Error saving: " + e.message); }
});

document.getElementById('debt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('debt-name').value;
    const items = document.getElementById('debt-items').value;
    const amount = document.getElementById('debt-amount').value;
    processDebt(currentStoreName, currentUser.email, name, items, amount, false).then(() => {
        e.target.reset();
        alert("Debt Recorded");
    });
});

document.getElementById('add-staff-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('new-staff-email').value;
    const role = document.getElementById('new-staff-role').value;
    addStaff(currentStoreName, email, role).then(() => { e.target.reset(); alert("Staff Added"); });
});

window.quickAddCategory = async () => {
    if(!isManager) return alert("Manager only");
    const newCat = prompt("New Category:");
    if(newCat) {
        const cats = [...(window.storeCategories||[]), newCat.trim()];
        await setDoc(doc(getCollectionRef(currentStoreName), '_config'), { categories: cats }, { merge: true });
    }
        }
