// PUBLIC browser config only (anon/publishable key is safe; service-role key is NOT).
window.TX = {
  SUPABASE_URL: "https://muqearwieqnkicfrrtgw.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cWVhcndpZXFua2ljZnJydGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjYxNDYsImV4cCI6MjEwODc0MjE0Nn0.omPhfMRZDM6Znm6nmXScTWFE6uiCdAcq38xJSbXhmzY",
  LINKS: { email: "", discord: "", telegram: "" }, // owner fills in; empty ones stay hidden
  BUSINESS: { legalName: "[Legal business name]", privacyEmail: "[privacy contact email]" }
};
TX.ok = !/YOUR_/.test(TX.SUPABASE_URL + TX.SUPABASE_ANON_KEY);
window.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.toast = (m, bad) => { const t = document.createElement("div"); t.className = "toast" + (bad ? " bad" : ""); t.textContent = m;
  t.setAttribute("role","status"); document.body.appendChild(t); setTimeout(() => t.remove(), 4500); };
