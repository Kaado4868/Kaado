import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOfDcEpw-p7DNuoUKqlGlTC782yiVdf00",
  authDomain: "cipher-e6c22.firebaseapp.com",
  projectId: "cipher-e6c22",
  storageBucket: "cipher-e6c22.appspot.com",
  messagingSenderId: "345358817477",
  appId: "1:345358817477:web:7ba4dd380d634b559038ac",
  measurementId: "G-CN75P4JDPW"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

onAuthStateChanged(auth, user=>{
  const btnSignIn=document.getElementById("btnSignIn");
  const btnLogout=document.getElementById("btnLogout");
  if(user){
    if(btnSignIn) btnSignIn.classList.add("hidden");
    if(btnLogout) btnLogout.classList.remove("hidden");
  }else{
    if(btnSignIn) btnSignIn.classList.remove("hidden");
    if(btnLogout) btnLogout.classList.add("hidden");
  }
});
if(document.getElementById("btnLogout")){
  document.getElementById("btnLogout").addEventListener("click",()=>signOut(auth));
}