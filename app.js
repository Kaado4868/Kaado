// ===== App Logic (Cipher + History + Leaderboard) =====

// Small helpers
const $ = (id) => document.getElementById(id);
const toastEl = document.getElementById("toast");
function toast(msg, t = 2200) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), t);
}

// Cipher
const vowelMap = { a: "1", e: "2", i: "3", o: "4", u: "5" };
const revMap = { "1": "a", "2": "e", "3": "i", "4": "o", "5": "u" };

window.encode = function () {
  const txt = $("input").value || "";
  let out = "";
  for (const ch of txt.toLowerCase()) {
    if (vowelMap[ch]) out += vowelMap[ch];
    else if (/[a-z]/.test(ch)) out += ch + "a";
    else out += ch;
  }
  $("output").value = out;
  addHistory("Encoded", txt, out);
};

window.decode = function () {
  const txt = $("input").value || "";
  let out = "";
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (revMap[c]) out += revMap[c];
    else if (/[a-z]/i.test(c) && txt[i + 1] === "a") {
      out += c;
      i++;
    } else out += c;
  }
  $("output").value = out;
  addHistory("Decoded", txt, out);
};

window.smartDetect = function () {
  const txt = ($("input").value || "").trim();
  if (!txt) return toast("No input");
  const digitCount = (txt.match(/[12345]/g) || []).length;
  const suffixCount = (txt.match(/[a-z]a/g) || []).length;
  if (digitCount > suffixCount) window.decode();
  else window.encode();
};

window.copyOutput = function () {
  const out = $("output").value || "";
  if (!out) return toast("Nothing to copy");
  navigator.clipboard.writeText(out).then(() => toast("Copied ✅"));
};

window.clearAll = function () {
  $("input").value = "";
  $("output").value = "";
};

// ====== History ======
function historyKey() {
  return "cipher_history";
}
function scoresKey() {
  return "cipher_scores";
}

function loadHistory() {
  return JSON.parse(localStorage.getItem(historyKey()) || "[]");
}
function saveHistory(arr) {
  localStorage.setItem(historyKey(), JSON.stringify(arr));
}
function renderHistory() {
  const arr = loadHistory();
  const el = $("historyList");
  if (!arr.length) {
    el.innerHTML = "<div class='small'>No history yet</div>";
    return;
  }
  el.innerHTML = arr
    .map(
      (h) =>
        `<div class="history-item"><b>${h.type}</b><div>${h.res}</div><small>${h.date}</small></div>`
    )
    .join("");
}
function addHistory(type, inp, res) {
  let arr = loadHistory();
  arr.unshift({ type, input: inp, res, date: new Date().toLocaleString() });
  arr = arr.slice(0, 50);
  saveHistory(arr);
  renderHistory();
}
window.copyHistory = function () {
  const arr = loadHistory();
  if (!arr.length) return toast("No history");
  navigator.clipboard
    .writeText(arr.map((h) => `${h.type}: ${h.res}`).join("\n"))
    .then(() => toast("Copied ✅"));
};
window.exportBackup = function () {
  const data = { history: loadHistory(), scores: loadScores() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cipher-backup.json";
  a.click();
};
window.importBackup = function () {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "application/json";
  inp.onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const txt = await f.text();
    try {
      const data = JSON.parse(txt);
      if (data.history) saveHistory(data.history);
      if (data.scores) saveScores(data.scores);
      renderHistory();
      renderLeaderboard();
      toast("Imported ✅");
    } catch {
      toast("Invalid file ❌");
    }
  };
  inp.click();
};
window.clearHistory = function () {
  if (!confirm("Clear history?")) return;
  localStorage.removeItem(historyKey());
  renderHistory();
};

// ====== Leaderboard (local) ======
function loadScores() {
  return JSON.parse(localStorage.getItem(scoresKey()) || "[]");
}
function saveScores(arr) {
  localStorage.setItem(scoresKey(), JSON.stringify(arr));
}
function renderLeaderboard() {
  const arr = loadScores();
  if (!arr.length) {
    $("leaderboard").innerHTML = "<div class='small'>No scores yet</div>";
    return;
  }
  $("leaderboard").innerHTML = arr
    .slice(0, 5)
    .map(
      (s, i) =>
        `#${i + 1} → ${s.score} (${new Date(s.date).toLocaleDateString()})`
    )
    .join("<br>");
}

// ====== Init ======
(function init() {
  $("year").textContent = new Date().getFullYear();
  renderHistory();
  renderLeaderboard();
})();