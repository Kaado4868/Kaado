import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, enableMultiTabIndexedDbPersistence, collection } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = { 
    apiKey: "AIzaSyBOfDcEpw-p7DNuoUKqlGlTC782yiVdf00", 
    authDomain: "cipher-e6c22.firebaseapp.com", 
    projectId: "cipher-e6c22", 
    storageBucket: "cipher-e6c22.firebasestorage.app", 
    messagingSenderId: "345358817477", 
    appId: "1:345358817477:web:7ba4dd380d634b559038ac" 
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'cipher-e6c22';
export const SUPER_ADMIN_EMAIL = "abdulkadirbukar2006@gmail.com";

// Enable Offline Persistence
try { enableMultiTabIndexedDbPersistence(db); } catch(e) { console.log("Persistence Error", e); }

// Helper to get collection based on current store name
export function getCollectionRef(storeName) { 
    if(!storeName) return null;
    const safeName = storeName.replace(/[^a-z0-9]/gi, '').toLowerCase(); 
    return collection(db, 'artifacts', appId, 'public', 'data', `pk_store_${safeName}`); 
}

export function getLogCollectionRef(storeName) { 
    if(!storeName) return null;
    const safeName = storeName.replace(/[^a-z0-9]/gi, '').toLowerCase(); 
    return collection(db, 'artifacts', appId, 'public', 'logs', `pk_store_${safeName}`); 
}
