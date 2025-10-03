// ===== Authentication (Local Simulation for Now) =====

const $ = (id) => document.getElementById(id);
const toastEl = document.getElementById("toast");
function toast(msg, t = 2200) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), t);
}

function userKey() {
  return "cipher_user";
}
function loadUser() {
  return JSON.parse(localStorage.getItem(userKey()) || "null");
}
function saveUser(u) {
  localStorage.setItem(userKey(), JSON.stringify(u));
}
function clearUser() {
  localStorage.removeItem(userKey());
}

// Login / Signup
window.login = function () {
  const email = $("loginEmail").value.trim();
  const pass = $("loginPass").value.trim();
  if (!email || !pass) return toast("Fill in all fields");
  let users = JSON.parse(localStorage.getItem("cipher_accounts") || "{}");
  if (!users[email]) return toast("User not found");
  if (users[email].password !== pass) return toast("Wrong password");
  saveUser({ email });
  toast("Login successful ✅");
  window.location.href = "index.html";
};

window.signup = function () {
  const email = $("loginEmail").value.trim();
  const pass = $("loginPass").value.trim();
  if (!email || !pass) return toast("Fill in all fields");
  let users = JSON.parse(localStorage.getItem("cipher_accounts") || "{}");
  if (users[email]) return toast("User already exists");
  users[email] = { password: pass };
  localStorage.setItem("cipher_accounts", JSON.stringify(users));
  saveUser({ email });
  toast("Account created ✅");
  window.location.href = "index.html";
};

window.resetPassword = function () {
  const email = $("loginEmail").value.trim();
  if (!email) return toast("Enter email first");
  let users = JSON.parse(localStorage.getItem("cipher_accounts") || "{}");
  if (!users[email]) return toast("No such user");
  users[email].password = "123456";
  localStorage.setItem("cipher_accounts", JSON.stringify(users));
  toast("Password reset to 123456 ✅");
};

window.continueGuest = function () {
  saveUser({ email: "guest" });
  toast("Continuing as Guest");
  window.location.href = "index.html";
};

// Logout
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (!confirm("Logout?")) return;
      clearUser();
      toast("Logged out");
      window.location.href = "login.html";
    });
  }
});

// Init label
document.addEventListener("DOMContentLoaded", () => {
  const u = loadUser();
  if (u && u.email) {
    if (document.getElementById("userLabel"))
      document.getElementById("userLabel").textContent = u.email;
  }
});