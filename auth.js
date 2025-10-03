import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const firebaseConfig={apiKey:"YOUR_API_KEY",authDomain:"cipher-e6c22.firebaseapp.com",projectId:"cipher-e6c22",storageBucket:"cipher-e6c22.appspot.com",messagingSenderId:"345358817477",appId:"1:345358817477:web:7ba4dd380d634b559038ac"};
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);

function $(id){return document.getElementById(id);}
function toast(m){alert(m)}

$('btnLogin').onclick=async()=>{try{await signInWithEmailAndPassword(auth,$('email').value,$('password').value);location.href="index.html";}catch(e){toast(e.message)}}
$('btnSignup').onclick