function toast(msg){
  const t=document.getElementById("toast");
  if(!t)return; t.textContent=msg;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2000);
}
const vowelMap={a:"1",e:"2",i:"3",o:"4",u:"5"};
const revMap={"1":"a","2":"e","3":"i","4":"o","5":"u"};

window.encode=()=>{
  const txt=document.getElementById("input").value;
  let out="";for(const c of txt.toLowerCase()){if(vowelMap[c])out+=vowelMap[c];else if(/[a-z]/.test(c))out+=c+"a";else out+=c;}
  document.getElementById("output").value=out;
};
window.decode=()=>{
  const txt=document.getElementById("input").value;
  let out="";for(let i=0;i<txt.length;i++){const c=txt[i];if(revMap[c])out+=revMap[c];else if(/[a-z]/i.test(c)&&txt[i+1]==="a"){out+=c;i++;}else out+=c;}
  document.getElementById("output").value=out;
};
window.smartDetect=()=>{const txt=document.getElementById("input").value;if(/[1-5]/.test(txt))decode();else encode();};
window.copyOutput=()=>{navigator.clipboard.writeText(document.getElementById("output").value);toast("Copied");};
window.clearAll=()=>{document.getElementById("input").value="";document.getElementById("output").value="";};