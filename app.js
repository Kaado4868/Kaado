import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Firebase config (merged)
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
const auth = getAuth(app);
const db = getFirestore(app);

// helpers
const $ = (id)=>document.getElementById(id);
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2000);}

// auth state
onAuthStateChanged(auth,(user)=>{
  if(user){ $("userLabel").textContent=user.email||"Guest"; $("btnSignIn").classList.add("hidden"); $("btnLogout").classList.remove("hidden"); }
  else{ $("userLabel").textContent="Not signed in"; $("btnSignIn").classList.remove("hidden"); $("btnLogout").classList.add("hidden"); }
});
$("btnLogout").onclick=()=>{ if(confirm("Logout?")) signOut(auth).then(()=>toast("Logged out")); };

// cipher
const vmap={a:"1",e:"2",i:"3",o:"4",u:"5"}; const rev={"1":"a","2":"e","3":"i","4":"o","5":"u"};
window.encode=()=>{let txt=$("input").value.toLowerCase(),out="";for(let c of txt){if(vmap[c])out+=vmap[c];else if(/[a-z]/.test(c))out+=c+"a";else out+=c} $("output").value=out;};
window.decode=()=>{let txt=$("input").value,out="";for(let i=0;i<txt.length;i++){let c=txt[i];if(rev[c])out+=rev[c];else if(/[a-z]/i.test(c)&&txt[i+1]==="a"){out+=c;i++;}else out+=c} $("output").value=out;};
window.smartDetect=()=>{let t=$("input").value;if(/[1-5]/.test(t))window.decode();else window.encode();};
window.copyOutput=()=>{navigator.clipboard.writeText($("output").value);toast("Copied");};
window.clearAll=()=>{$("input").value="";$("output").value="";};

// quiz
const QUESTIONS=["The quick brown fox jumps over the lazy dog.","Knowledge is power, but wisdom is everything.","Dream big and dare to fail.","Great things never come from comfort zones.","Hard work beats talent when talent doesn’t work hard.","The secret of getting ahead is getting started.","Do not watch the clock. Do what it does. Keep going.","Small steps every day add up to big results.","Creativity is intelligence having fun.","Be kind whenever possible. It is always possible."];
let qi=0,score=0,pool=[],timer=null,remain=60;
function encodeSentence(s){let out="";for(let c of s.toLowerCase()){if(vmap[c])out+=vmap[c];else if(/[a-z]/.test(c))out+=c+"a";else out+=c}return out;}
window.startQuiz=()=>{if(!auth.currentUser)return toast("Login required");pool=[...QUESTIONS].sort(()=>Math.random()-0.5).slice(0,5);qi=0;score=0;nextQ();};
function nextQ(){if(qi>=pool.length)return finish();const s=pool[qi];$("quizContainer").innerHTML=`<div><b>Q${qi+1}</b>: ${encodeSentence(s)}</div><input id="ans"><button onclick="submitQ('${s.replace(/'/g,"\\'")}')">Submit</button>`;remain=60;clearInterval(timer);timer=setInterval(()=>{remain--;if(remain<=0){clearInterval(timer);nextQ();}document.getElementById("quizTimer").textContent=remain;},1000);}
window.submitQ=(corr)=>{clearInterval(timer);const a=document.getElementById("ans").value;if(a.toLowerCase()===corr.toLowerCase()){score++;toast("Correct");}else toast("Wrong → "+corr);qi++;setTimeout(nextQ,800);};
function finish(){$("quizContainer").innerHTML=`Finished! Score ${score}/${pool.length}`;localStorage.setItem("quizLast",Date.now());}
$("year").textContent=new Date().getFullYear();