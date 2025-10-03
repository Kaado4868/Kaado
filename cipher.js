const inputEl = document.getElementById("input");
const outputEl = document.getElementById("output");
const historyEl = document.getElementById("historyList");

function $(id){ return document.getElementById(id); }
function toast(msg){ 
  const t = $('toast'); 
  t.textContent=msg; 
  t.classList.add('show'); 
  setTimeout(()=>t.classList.remove('show'),2000); 
}

const vowelMap = {a:"1",e:"2",i:"3",o:"4",u:"5"};
const revMap = {"1":"a","2":"e","3":"i","4":"o","5":"u"};

function encode(){
  let txt=inputEl.value.toLowerCase(), res="";
  for(let ch of txt){ if(vowelMap[ch]) res+=vowelMap[ch]; else if(/[a-z]/.test(ch)) res+=ch+"a"; else res+=ch; }
  outputEl.value=res; addHistory("Encoded",res);
}

function decode(){
  let txt=inputEl.value,res="";
  for(let i=0;i<txt.length;i++){ 
    let ch=txt[i];
    if(revMap[ch]) res+=revMap[ch]; 
    else if(/[a-z]/i.test(ch) && txt[i+1]==="a"){res+=ch;i++;} 
    else res+=ch;
  }
  outputEl.value=res; addHistory("Decoded",res);
}

function smartDetect(){
  const txt=inputEl.value.trim();
  if(!txt) return toast("No input");
  const digits=(txt.match(/[12345]/g)||[]).length;
  const suffix=(txt.match(/[a-z]a/g)||[]).length;
  digits>suffix?decode():encode();
}

function copyOutput(){ if(!outputEl.value) return toast("Nothing"); navigator.clipboard.writeText(outputEl.value); toast("Copied"); }
function clearAll(){ inputEl.value=""; outputEl.value=""; }

// History
function addHistory(type,res){
  let hist=JSON.parse(localStorage.getItem("history")||"[]");
  hist.unshift({type,res,date:new Date().toLocaleString()});
  localStorage.setItem("history",JSON.stringify(hist.slice(0,20)));
  renderHistory();
}
function renderHistory(){
  let hist=JSON.parse(localStorage.getItem("history")||"[]");
  historyEl.innerHTML=hist.length?hist.map(h=>`<div class="history-item"><b>${h.type}</b><br>${h.res}<br><small>${h.date}</small></div>`).join(""):"<div class='small'>No history</div>";
}
function copyHistory(){ let hist=JSON.parse(localStorage.getItem("history")||"[]"); if(!hist.length)return toast("Empty"); navigator.clipboard.writeText(hist.map(h=>`${h.type}: ${h.res}`).join("\n")); toast("Copied"); }
function clearHistory(){ localStorage.removeItem("history"); renderHistory(); }

$('year').textContent=new Date().getFullYear();
renderHistory();