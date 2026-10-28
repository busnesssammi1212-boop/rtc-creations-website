const $ = s => document.querySelector(s);
let services = [];
if (!TX.ok) $("#cfgerr").hidden = false;
$("#menu").onclick = () => $("#nav").classList.toggle("open");
document.querySelectorAll("#nav a").forEach(a => a.onclick = () => $("#nav").classList.remove("open"));
Object.entries(TX.LINKS).forEach(([k, v]) => { const a = $("#c-" + k); if (v && a) { a.href = k === "email" ? "mailto:" + v : v; a.hidden = false; } });
document.querySelectorAll(".biz").forEach(e => e.textContent = TX.BUSINESS[e.dataset.k]);

async function loadServices() {
  const box = $("#svc"); if (!TX.ok) { box.innerHTML = "<p class='muted'>Services unavailable: site not configured.</p>"; return; }
  try {
    const r = await fetch(`${TX.SUPABASE_URL}/rest/v1/services?select=*&is_active=eq.true&order=created_at`,
      { headers: { apikey: TX.SUPABASE_ANON_KEY, Authorization: "Bearer " + TX.SUPABASE_ANON_KEY } });
    if (!r.ok) throw 0; services = await r.json();
    box.innerHTML = services.map(s => `<article class="card"><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p>
      <ul>${(s.features || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      <p class="meta"><b>${s.price ? esc(s.price) : "Custom Quote"}</b>${s.estimated_delivery ? " · Delivery: " + esc(s.estimated_delivery) : ""}</p>
      <button class="btn" data-id="${esc(s.id)}">Order This Service</button></article>`).join("") || "<p class='muted'>No services available yet.</p>";
    $("#service").innerHTML = "<option value=''>Select a service</option>" + services.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("");
    box.querySelectorAll("button").forEach(b => b.onclick = () => { $("#service").value = b.dataset.id; location.hash = "order"; $("#name").focus(); });
  } catch { box.innerHTML = "<p class='err'>Could not load services. Refresh to try again.</p>"; }
}
async function post(body) {
  const r = await fetch(`${TX.SUPABASE_URL}/functions/v1/submit`, { method: "POST",
    headers: { "Content-Type": "application/json", apikey: TX.SUPABASE_ANON_KEY, Authorization: "Bearer " + TX.SUPABASE_ANON_KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.ok) throw new Error(j.error || "Request failed."); return j;
}
function wire(form, build, done) {
  form.onsubmit = async e => {
    e.preventDefault(); if (form.dataset.busy) return;
    if (!TX.ok) return toast("Site is not configured yet.", true);
    if (!form.reportValidity()) return;
    const btn = form.querySelector("button[type=submit]"), label = btn.textContent;
    form.dataset.busy = 1; btn.disabled = true; btn.textContent = "SENDING...";
    try { done(await post(build(new FormData(form))), form); }
    catch (err) { toast(err.message || "Network error.", true); }
    finally { delete form.dataset.busy; btn.disabled = false; btn.textContent = label; }
  };
}
wire($("#orderForm"), f => ({ type: "order", name: f.get("name"), email: f.get("email"), phone: f.get("phone"), platform: f.get("platform"),
  contact: f.get("contact"), service_id: f.get("service_id"), description: f.get("description"), extra: f.get("extra"), website: f.get("website") }),
  (j, form) => { const ok = $("#orderOk"); ok.hidden = false;
    ok.textContent = `Your order has been submitted successfully! Your Order ID is ${j.order_number}. Our team will review your request. Save this ID.`;
    form.reset(); toast("Order saved: " + j.order_number); });
wire($("#contactForm"), f => ({ type: "contact", name: f.get("name"), email: f.get("email"), message: f.get("message"), website: f.get("website") }),
  (j, form) => { form.reset(); toast("Message sent."); });
const of = $("#orderForm");
[of.email, of.phone].forEach(i => i.oninput = () => of.email.setCustomValidity(of.email.value.trim() || of.phone.value.trim() ? "" : "Enter an email or a phone number"));
loadServices();
