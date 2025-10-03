// Questions
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

const vowelMap = { a: "1", e: "2", i: "3", o: "4", u: "5" };
function encodeSentence(s) {
  let out = "";
  for (const ch of s.toLowerCase()) {
    if (vowelMap[ch]) out += vowelMap[ch];
    else if (/[a-z]/.test(ch)) out += ch + "a";
    else out += ch;
  }
  return out;
}

let pool = [], qi = 0, score = 0, timer = null, remaining = 60;
const TOTAL = 25;

const questionText = document.getElementById("questionText");
const quizAnswer = document.getElementById("quizAnswer");
const quizProgress = document.getElementById("quizProgress");
const quizTimer = document.getElementById("quizTimer");

window.startQuiz = function () {
  pool = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, TOTAL);
  qi = 0; score = 0;
  showQuestion();
};

function showQuestion() {
  if (qi >= pool.length) return endQuiz();
  const q = pool[qi];
  questionText.innerHTML = `<b>Decode this:</b><br><br> ${encodeSentence(q)}`;
  quizAnswer.value = "";
  quizProgress.textContent = `${qi + 1}/${TOTAL}`;
  remaining = 60;
  quizTimer.textContent = remaining;

  clearInterval(timer);
  timer = setInterval(() => {
    remaining--;
    quizTimer.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(timer);
      nextQuiz();
    }
  }, 1000);
}

window.submitQuiz = function () {
  clearInterval(timer);
  const ans = quizAnswer.value.trim().toLowerCase();
  const correct = pool[qi].toLowerCase();

  if (ans === correct) {
    score++;
    alert("✅ Correct!");
  } else {
    alert("❌ Wrong! Correct answer: " + pool[qi]);
  }

  qi++;
  setTimeout(showQuestion, 500);
};

window.nextQuiz = function () {
  clearInterval(timer);
  qi++;
  showQuestion();
};

window.endQuiz = function () {
  clearInterval(timer);
  questionText.innerHTML = `🎉 Finished! <br> Score: ${score}/${TOTAL}`;
  quizProgress.textContent = `${TOTAL}/${TOTAL}`;
};