export function formatMoney(amount) {
    const val = parseFloat(amount);
    if (isNaN(val)) return '0.00';
    return val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeHtml(s) {
    return s ? s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
}

let audioCtx = null;
export function playBeep() { 
    try { 
        if (navigator.vibrate) navigator.vibrate(200); 
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
        if (audioCtx.state === 'suspended') audioCtx.resume(); 
        const oscillator = audioCtx.createOscillator(); 
        const gainNode = audioCtx.createGain(); 
        oscillator.connect(gainNode); 
        gainNode.connect(audioCtx.destination); 
        oscillator.type = 'square'; 
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); 
        oscillator.start(); 
        oscillator.stop(audioCtx.currentTime + 0.15); 
    } catch (e) { console.error("Sound Fail", e); } 
}

// Simple Log Action Helper
import { addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { getLogCollectionRef } from './config.js';

export async function logAction(storeName, userEmail, action, details, meta = {}) {
    if(!storeName) return;
    addDoc(getLogCollectionRef(storeName), { 
        action: action, 
        details: details, 
        user: userEmail, 
        timestamp: serverTimestamp(), 
        meta: JSON.parse(JSON.stringify(meta))
    }).catch(e => console.log("Log pending"));
}
