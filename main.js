import { auth, SUPER_ADMIN_EMAIL, getCollectionRef } from './config.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, collection } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { startDataSync, renderList, visibleItems } from './inventory.js';
import { CartManager } from './cart.js';
import { switchAdminTab, softDeleteItem, restoreItem } from './admin.js';

// Global State
let currentStoreName = localStorage.getItem('pk_store_name');
let currentUser = null;
let isSuperAdmin = false;
let isManager = false;

// Expose functions to HTML
window.CartManager = CartManager;
window.logout = () => signOut(auth);
window.toggleDarkMode = () => { document.documentElement.classList.toggle('dark'); };
window.openSuperAdmin = () => { if(isManager) { document.getElementById('admin-modal').classList.remove('hidden'); switchAdminTab('stats', currentStoreName); } };
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
window.switchAdminTab = (tab) => switchAdminTab(tab, currentStoreName);
window.softDeleteItem = (id) => softDeleteItem(id, currentStoreName, currentUser.email);
window.restoreItem = (id) => restoreItem(id, currentStoreName, currentUser.email);
window.getItem = (id) => visibleItems.find(i => i.id === id);

// --- AUTH LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if(currentStoreName) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            document.getElementById('welcome-msg').innerText = `Welcome, ${user.displayName || 'User'}`;
            
            checkPermissions();
        }
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
    }
});

// Permissions & Config Listener
function checkPermissions() {
    const configRef = doc(getCollectionRef(currentStoreName), '_config');
    onSnapshot(configRef, (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            const staff = data.staff || {};
            const categories = data.categories || ['General'];
            window.storeCategories = categories; // Global category list

            isSuperAdmin = (currentUser.email === SUPER_ADMIN_EMAIL.toLowerCase());
            const role = staff[currentUser.email.toLowerCase()];
            
            if (!isSuperAdmin && !role) {
                alert("Access Denied");
                signOut(auth);
                return;
            }
            
            isManager = isSuperAdmin || (role === 'manager');
            
            // Init Modules
            startDataSync(currentStoreName, isManager);
            CartManager.init(currentStoreName, currentUser);
            
            // UI Updates
            const roleText = isSuperAdmin ? "ADMIN" : (isManager ? "MANAGER" : "STAFF");
            document.getElementById('role-badge').innerText = roleText;
            if(isManager) document.getElementById('super-admin-btn').classList.remove('hidden');
            
        } else if (currentUser.email === SUPER_ADMIN_EMAIL.toLowerCase()) {
            // Init Config if missing
            setDoc(configRef, { staff: {}, categories: ['General'] });
        }
    });
}

// Login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('store-name-input').value.toUpperCase();
    if(name.length < 2) return alert("Invalid Name");
    localStorage.setItem('pk_store_name', name);
    currentStoreName = name;
    signInWithPopup(auth, new GoogleAuthProvider());
});

// Search Listener
document.getElementById('search-input').addEventListener('input', () => renderList(isManager));

// Item Form Logic (Add/Edit)
window.openItemModal = () => { 
    document.getElementById('modal').classList.remove('hidden'); 
    document.getElementById('item-form').reset(); 
    document.getElementById('item-id').value = '';
    // Populate Categories
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
    document.getElementById('category-input').value = item.category || 'General';
};

document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!isManager) return;
    
    const id = document.getElementById('item-id').value;
    const data = {
        name: document.getElementById('name-input').value.trim(),
        price: parseFloat(document.getElementById('price-input').value),
        category: document.getElementById('category-input').value,
        barcode: document.getElementById('barcode-input').value.trim(),
        isDeleted: false,
        updatedAt: serverTimestamp()
    };
    
    const ref = getCollectionRef(currentStoreName);
    
    try {
        if(id) {
            await updateDoc(doc(ref, id), data);
        } else {
            data.createdAt = serverTimestamp();
            // Use dummy ID generation or addDoc
            await setDoc(doc(collection(ref.firestore, ref.path)), data);
        }
        window.closeModal('modal');
    } catch(e) { alert("Error saving: " + e.message); }
});

// Quick Add Category
window.quickAddCategory = async () => {
    if(!isManager) return alert("Manager only");
    const newCat = prompt("New Category:");
    if(newCat) {
        const cats = [...(window.storeCategories||[]), newCat.trim()];
        await setDoc(doc(getCollectionRef(currentStoreName), '_config'), { categories: cats }, { merge: true });
    }
}
