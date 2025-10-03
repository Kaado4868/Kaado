import { auth } from "./firebase-init.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

function toast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2000);
}

document.getElementById("btnLogin").onclick=()=>{
  const email=document.getElementById("email").value;
  const pass=document.getElementById("password").value;
  signInWithEmailAndPassword(auth,email,pass).then(()=>{toast("Logged in");location.href="index.html"}).catch(e=>toast(e.message));
};

document.getElementById("btnSignup").onclick=()=>{
  const email=document.getElementById("email").value;
  const pass=document.getElementById("password").value;
  createUserWithEmailAndPassword(auth,email,pass).then(()=>{toast("Account created");location.href="index.html"}).catch(e=>toast(e.message));
};

document.getElementById("btnGuest").onclick=()=>{
  signInAnonymously(auth).then(()=>{toast("Guest mode");location.href="index.html"}).catch(e=>toast(e.message));
};

document.getElementById("btnReset").onclick=()=>{
  const email=document.getElementById("email").value;
  if(!email) return toast("Enter your email");
  sendPasswordResetEmail(auth,email).then(()=>toast("Reset link sent")).catch(e=>toast(e.message));
};