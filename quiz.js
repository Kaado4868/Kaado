function toast(msg){
  const t=document.getElementById("toast");
  if(!t)return; t.textContent=msg;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2000);
}
const QUESTIONS=[
 "The quick brown fox jumps over the lazy dog.",
 "Knowledge is power, but wisdom is everything.",
 "Success usually comes to those who are too busy to be looking for it.",
 "Do not watch the clock. Do what it does. Keep going.",
 "Difficult roads often lead to beautiful destinations.",
 "Hard work beats talent when talent doesn’t work hard.",
 "Great things never come from comfort zones.",
 "Dream big and dare to fail.",
 "The only limit to our realization of tomorrow is our doubts of today.",
 "Opportunities don't happen, you create them.",
 "If you want something you've never had, you must be willing to do something you've never done.",
 "Life is 10% what happens to us and 90% how we react to it.",
 "It always seems impossible until it's done.",
 "Don't wait. The time will never be just right.",
 "Act as if what you do makes a difference. It does.",
 "The harder you fall, the higher you bounce.",
 "Small steps every day add up to big results over time.",
 "Creativity is intelligence having fun.",
 "Be kind whenever possible. It is always possible.",
 "Change your thoughts and you change your world.",
 "A smooth sea never made a skilled sailor.",
 "The secret of getting ahead is getting started.",
 "Turn your wounds into wisdom and lessons into strength.",
 "Perseverance is not a long race; it is many short races one after another.",
 "Value the people who value you; pay attention to where you spend your time."
];
let pool=[],qi=0,score=0,timer=null,remaining=60;
function encSentence(s){let out="";for(const c of s.toLowerCase()){if("aeiou".includes(c)){out+=vowelMap[c];}else if(/[a-z]/.test(c))out+=c+"a";else out+=c;}return out;}

window.startQuiz=function(){
  pool=[...QUESTIONS].sort(()=>Math.random()-0.5).slice(0,5);
  qi=0;score=0;showQ();
};
function showQ(){if(qi>=pool.length)return endQ();const s=pool[qi];document.getElementById("quizBox").innerHTML=`<div><b>Decode:</b> ${encSentence(s)}</div><input id='ans'><button class='btn' onclick="submitQ('${s.replace(/'/g,"\\'")}')">Submit</button><div>⏱<span id='time'>60</span>s</div>`;remaining=60;clearInterval(timer);timer=setInterval(()=>{remaining--;document.getElementById("time").textContent=remaining;if(remaining<=0){clearInterval(timer);nextQ();}},1000);}
window.submitQ=function(correct){clearInterval(timer);const a=document.getElementById("ans").value;if(a.toLowerCase()===correct.toLowerCase()){score++;toast("✅ Correct")}else toast("❌ Wrong: "+correct);qi++;setTimeout(showQ,800);}
function nextQ(){qi++;showQ();}
function endQ(){document.getElementById("quizBox").innerHTML=`Finished! Score: ${score}/${pool.length}`;}