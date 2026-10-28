// Server-verified: login, then confirm role='admin' in profiles (RLS-protected). UI checks are convenience only; RLS enforces access.
if (!TX.ok) document.getElementById("cfgerr").hidden = false;
const sb = TX.ok ? supabase.createClient(TX.SUPABASE_URL, TX.SUPABASE_ANON_KEY) : null;
async function isAdmin() { const { data: { user } } = await sb.auth.getUser(); if (!user) return false;
  const { data } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle(); return data?.role === "admin"; }
document.getElementById("lf")?.addEventListener("submit", async e => {
  e.preventDefault(); const m = document.getElementById("msg"); m.textContent = ""; if (!sb) return m.textContent = "Site not configured.";
  const { error } = await sb.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
  if (error) return m.textContent = "Login failed.";
  if (!(await isAdmin())) { await sb.auth.signOut(); return m.textContent = "This account is not an administrator."; }
  location.href = "dashboard.html";
});
