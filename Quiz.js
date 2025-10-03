// ===== Quiz Logic (Local Only) =====
const $ = (id) => document.getElementById(id);
const toastEl = document.getElementById("toast");
function toast(msg, t = 2000) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), t);
}

// Questions pool (25)
const QUESTIONS = [
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

let pool = [], qi = 0, score = 0, timer = null, timeLeft = 60;

const vowelMap = { a: "1", e: "2", i: "3", o: "4", u: "5" };
function encSentence(s) {
  let out = "";
  for (const ch of s.toLowerCase()) {
    if (vowelMap[ch]) out += vowelMap[ch];
    else if (/[a-z]/.test(ch)) out += ch + "a";
    else out += ch;
  }
  return out;
}

window.startQuiz = function () {
  pool = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
  qi = 0; score = 0;
  showQuestion();
};

function showQuestion() {
  if (qi >= pool.length) return endQuiz();
  const s = pool[qi];
  $("questionText").innerHTML = "<b>Decode this:</b><br>" + encSentence(s);
  $("quizAnswer").value = "";
  $("quizProgress").textContent = (qi + 1) + "/" + pool.length;
  timeLeft = 60; $("quizTimer").textContent = timeLeft;
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    $("quizTimer").textContent = timeLeft;
    if (timeLeft <= 0) { clearInterval(timer); toast("⏱ Time's up"); nextQuiz(); }
  }, 1000);
}

window.submitQuiz = function () {
  clearInterval(timer);
  const ans = ($("quizAnswer").value || "").trim();
  const corr = pool[qi];
  if (ans.toLowerCase() === corr.toLowerCase()) { score++; toast("✅ Correct"); }
  else toast("❌ Wrong — " + corr);
  qi++; setTimeout(showQuestion, 600);
};

window.nextQuiz = function () {
  clearInterval(timer);
  qi++; showQuestion();
};
window.endQuiz = function () {
  clearInterval(timer);
  endQuiz();
};

function endQuiz() {
  $("questionText").textContent = "Finished — Score: " + score + "/" + pool.length;
  const arr = JSON.parse(localStorage.getItem("cipher_scores") || "[]");
  arr.unshift({ score, date: new Date().toISOString() });
  localStorage.setItem("cipher_scores", JSON.stringify(arr.slice(0, 20)));
}