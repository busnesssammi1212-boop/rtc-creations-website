// PUBLIC browser config only (anon/publishable key is safe; service-role key is NOT).
window.TX = {
  SUPABASE_URL: "YOUR_SUPABASE_URL",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  LINKS: { email: "", discord: "", telegram: "" }, // owner fills in; empty ones stay hidden
  BUSINESS: { legalName: "[Legal business name]", privacyEmail: "[privacy contact email]" }
};
TX.ok = !/YOUR_/.test(TX.SUPABASE_URL + TX.SUPABASE_ANON_KEY);
window.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.toast = (m, bad) => { const t = document.createElement("div"); t.className = "toast" + (bad ? " bad" : ""); t.textContent = m;
  t.setAttribute("role","status"); document.body.appendChild(t); setTimeout(() => t.remove(), 4500); };
