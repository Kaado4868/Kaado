const inputEl = document.getElementById("input");
const outputEl = document.getElementById("output");
const historyEl = document.getElementById("history");
let history = JSON.parse(localStorage.getItem("cipherHistory") || "[]");

function renderHistory() {
  historyEl.innerHTML = history.length === 0 
    ? "<p style='opacity:0.7'>No history yet.</p>"
    : history.map((h, i) => `
      <div class="history-item">
        <strong>${h.type}:</strong> ${h.result}
        <br>
        <button onclick="useHistory(${i})">Use</button>
        <button onclick="navigator.clipboard.writeText('${h.result}').then(()=>alert('Copied'))">Copy</button>
      </div>`).join("");
}

function saveHistory(item) {
  history.unshift(item);
  history = history.slice(0, 20);
  localStorage.setItem("cipherHistory", JSON.stringify(history));
  renderHistory();
}

function encode() {
  let text = inputEl.value.toLowerCase();
  let result = "";
  let vowels = {a:"1", e:"2", i:"3", o:"4", u:"5"};
  for (let ch of text) {
    if (vowels[ch]) result += vowels[ch];
    else if (/[a-z]/.test(ch)) result += ch + "a";
    else result += ch;
  }
  outputEl.value = result;
  saveHistory({type:"Encoded", input:text, result});
}

function decode() {
  let text = inputEl.value;
  let result = "";
  let vowels = {"1":"a","2":"e","3":"i","4":"o","5":"u"};
  for (let i=0;i<text.length;i++) {
    let ch = text[i];
    if (vowels[ch]) result += vowels[ch];
    else if (/[a-z]/i.test(ch)) {
      result += ch;
      if (text[i+1]==="a") i++;
    } else result += ch;
  }
  outputEl.value = result;
  saveHistory({type:"Decoded", input:text, result});
}

function autoDetect() {
  const text = inputEl.value.trim();
  if (!text) return;
  const digitCount = (text.match(/[12345]/g) || []).length;
  const vowelCount = (text.match(/[aeiou]/gi) || []).length;
  if (digitCount > vowelCount) decode();
  else encode();
}

function clearAll() {
  inputEl.value = "";
  outputEl.value = "";
}

function copyResult() {
  if (!outputEl.value) return alert("Nothing to copy");
  navigator.clipboard.writeText(outputEl.value);
  alert("Copied to clipboard ✅");
}

function shareResult() {
  if (!outputEl.value) return alert("Nothing to share");
  if (navigator.share) {
    navigator.share({title:"Secret Cipher", text:outputEl.value});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(outputEl.value)}`, "_blank");
  }
}

function downloadResult() {
  if (!outputEl.value) return alert("Nothing to download");
  const blob = new Blob([outputEl.value], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cipher-result.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function showQR() {
  if (!outputEl.value) return alert("Nothing to generate");
  const canvas = document.getElementById("qrCanvas");
  QRCode.toCanvas(canvas, outputEl.value, { width: 200 }, function (error) {
    if (error) console.error(error);
    document.getElementById("qrModal").style.display = "block";
  });
}

function closeQR() {
  document.getElementById("qrModal").style.display = "none";
}

function copyHistory() {
  if (!history.length) return alert("No history");
  const all = history.map(h => `${h.type}: ${h.result}`).join("\n");
  navigator.clipboard.writeText(all);
  alert("History copied ✅");
}

function clearHistory() {
  if (!confirm("Clear history?")) return;
  history = [];
  localStorage.removeItem("cipherHistory");
  renderHistory();
}

function useHistory(i) {
  inputEl.value = history[i].result;
  autoDetect();
}

// Theme toggle
const themeToggle = document.getElementById("themeToggle");
function applyTheme() {
  document.body.classList.toggle("dark", localStorage.getItem("theme") === "dark");
}
themeToggle.addEventListener("click", () => {
  const newTheme = localStorage.getItem("theme") === "dark" ? "light" : "dark";
  localStorage.setItem("theme", newTheme);
  applyTheme();
});

document.getElementById("year").textContent = new Date().getFullYear();
applyTheme();
renderHistory();
