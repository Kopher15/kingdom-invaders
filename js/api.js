// FCA CVR — API Utilities

const API_URL = "https://script.google.com/macros/s/AKfycbzxKcw8wfGmKSBy9GviiBr3SEKghvRm17Xg9UZ4cSWAChuA0qalJCQyrxvz3QaNe2Xm/exec";

// ── Auth helpers ──────────────────────────────────────────────

function getToken()    { return localStorage.getItem("fca_token"); }
function getUser()     { return JSON.parse(localStorage.getItem("fca_user") || "{}"); }
function isAdmin()     { return getUser().role === "admin"; }
function isLoggedIn()  { return !!getToken(); }

function saveSession(data) {
  localStorage.setItem("fca_token", data.token);
  localStorage.setItem("fca_user", JSON.stringify({
    user_id:           data.user_id,
    role:              data.role,
    full_name:         data.full_name,
    campus_assignment: data.campus_assignment
  }));
}

function clearSession() {
  localStorage.removeItem("fca_token");
  localStorage.removeItem("fca_user");
}

function requireAuth(redirectTo = "index.html") {
  if (!isLoggedIn()) { window.location.href = redirectTo; }
}

function requireAdmin(redirectTo = "calendar.html") {
  if (!isAdmin()) { window.location.href = redirectTo; }
}

// ── Fetch wrappers ────────────────────────────────────────────
// Apps Script requires Content-Type: text/plain to avoid CORS preflight.

async function apiGet(params = {}) {
  params.token = getToken();
  const qs   = new URLSearchParams(params).toString();
  const res  = await fetch(`${API_URL}?${qs}`, { redirect: "follow" });
  const data = await res.json();
  if (data.error === "Unauthorized.") { clearSession(); window.location.href = "index.html"; return {}; }
  return data;
}

async function apiPost(payload = {}) {
  payload.token = getToken();
  const res  = await fetch(API_URL, {
    method:   "POST",
    headers:  { "Content-Type": "text/plain" },
    body:     JSON.stringify(payload),
    redirect: "follow"
  });
  const data = await res.json();
  if (data.error === "Unauthorized.") { clearSession(); window.location.href = "index.html"; return {}; }
  return data;
}

// ── Auth calls ────────────────────────────────────────────────

async function login(username, password) {
  const res = await fetch(API_URL, {
    method:   "POST",
    headers:  { "Content-Type": "text/plain" },
    body:     JSON.stringify({ action: "login", username, password }),
    redirect: "follow"
  });
  return res.json();
}

async function logout() {
  const token = getToken();
  if (token) await apiPost({ action: "logout", token });
  clearSession();
  window.location.href = "index.html";
}

// ── Events ────────────────────────────────────────────────────

function getEvents(month, year, campus_id = "") {
  return apiGet({ action: "getEvents", month, year, campus_id });
}

function createEvent(payload) {
  return apiPost({ action: "createEvent", ...payload });
}

function updateEvent(event_id, payload) {
  return apiPost({ action: "updateEvent", event_id, ...payload });
}

function deleteEvent(event_id, opts = {}) {
  return apiPost({ action: "deleteEvent", event_id, ...opts });
}

// ── Categories ────────────────────────────────────────────────

function getCategories() {
  return apiGet({ action: "getCategories" });
}

// ── Topics ────────────────────────────────────────────────────

function getTopics() {
  return apiGet({ action: "getTopics" });
}

// ── UI helpers ────────────────────────────────────────────────

function showAlert(el, message, type = "error") {
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.style.display = "block";
}

function hideAlert(el) {
  el.style.display = "none";
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// Pad a number to 2 digits
function pad2(n) { return String(n).padStart(2, "0"); }

// Format a date string "yyyy-MM-dd" → "Mon, Jan 1"
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// Format time "HH:MM" → "9:00 AM"
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr   = h % 12 || 12;
  return `${hr}:${pad2(m)} ${ampm}`;
}
