import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, setDoc, enableMultiTabIndexedDbPersistence, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { showApp, showLogin, updateUI, showUsernameModal } from './ui.js';

const firebaseConfig = { apiKey: "AIzaSyBOfDcEpw-p7DNuoUKqlGlTC782yiVdf00", authDomain: "cipher-e6c22.firebaseapp.com", projectId: "cipher-e6c22", storageBucket: "cipher-e6c22.firebasestorage.app", messagingSenderId: "345358817477", appId: "1:345358817477:web:7ba4dd380d634b559038ac" };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'cipher-e6c22';

// Enable Offline Persistence
enableMultiTabIndexedDbPersistence(db).catch(err => console.log('Persistence:', err.code));

export let currentUser = null;
export let userRole = 'staff'; // staff, manager, admin, super_admin
export let userDisplayName = '';
export let currentStoreName = localStorage.getItem('pk_store_name');
export let allItems = [];
export const SUPER_ADMIN_EMAIL = "abdulkadirbukar2006@gmail.com";

export function getCollectionRef() {
    if(!currentStoreName) return null;
    const safeName = currentStoreName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return collection(db, 'artifacts', appId, 'public', 'data', `pk_store_${safeName}`);
}

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (currentStoreName) {
            const configRef = doc(getCollectionRef(), '_config');
            onSnapshot(configRef, (docSnap) => {
                const data = docSnap.data() || { staff: {} };
                const email = user.email.toLowerCase();
                const staffData = data.staff[email];

                // Role Logic
                if (email === SUPER_ADMIN_EMAIL) userRole = 'super_admin';
                else if (staffData && typeof staffData === 'object') userRole = staffData.role;
                else if (staffData) userRole = staffData; // Legacy string support
                else { alert("Access Denied"); return signOut(auth); }

                // Mandatory Username Logic
                if (email !== SUPER_ADMIN_EMAIL) {
                    if (staffData && staffData.name) {
                        userDisplayName = staffData.name;
                    } else {
                        // FORCE NAME CREATION
                        showUsernameModal(email, staffData ? staffData.role : 'staff');
                        return; // Stop here until name is saved
                    }
                } else {
                    userDisplayName = "Super Admin";
                }

                showApp();
                updateUI();
            });
            startDataSync();
        }
    } else {
        showLogin();
    }
});

function startDataSync() {
    onSnapshot(getCollectionRef(), (snapshot) => {
        allItems = snapshot.docs.map(d => ({id: d.id, ...d.data()}))
                   .filter(i => i.id !== '_config' && i.id !== 'debtors' && !i.isDeleted);
        window.renderList(); // Trigger UI refresh
    });
}

// Save New Username
window.saveUsername = async () => {
    const name = document.getElementById('new-username-input').value.trim();
    if (name.length < 3) return alert("Name too short");
    
    const email = currentUser.email.toLowerCase();
    const configRef = doc(getCollectionRef(), '_config');
    // We need to read existing config first to not overwrite others (handled by onSnapshot usually but for setDoc using merge)
    // Construct the nested update key
    const updateData = {};
    updateData[`staff.${email}`] = { role: userRole, name: name }; // Ensure object format

    try {
        await setDoc(configRef, updateData, { merge: true });
        document.getElementById('username-modal').classList.add('hidden');
        // Snapshot listener will auto-trigger showApp
    } catch(e) { alert("Error saving name: " + e.message); }
};

window.logout = () => signOut(auth).then(() => location.reload());

// Helpers
export const formatMoney = (n) => parseFloat(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });
