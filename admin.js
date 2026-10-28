const $ = s => document.querySelector(s), PAGE = 15, ST = ["Pending","Reviewed","In Progress","Completed","Cancelled"];
let page = 0, total = 0, svcList = [], rowsData = [];
(async () => { if (!sb || !(await isAdmin())) return (location.href = "login.html"); await loadSvcs(); stats(); list(); })();
$("#out").onclick = async () => { await sb.auth.signOut(); location.href = "login.html"; };
$("#tOrders").onclick = e => { e.preventDefault(); $("#orders").hidden = false; $("#svcs").hidden = true; $("#cm").hidden = true; };
$("#tSvc").onclick = e => { e.preventDefault(); $("#orders").hidden = true; $("#cm").hidden = true; $("#svcs").hidden = false; renderSvcs(); };
["q","fs","fst","so"].forEach(i => $("#" + i).onchange = () => { page = 0; list(); });
$("#prev").onclick = () => { if (page > 0) { page--; list(); } }; $("#next").onclick = () => { if ((page + 1) * PAGE < total) { page++; list(); } };
setInterval(() => { stats(); list(true); }, 30000); // polling fallback; RLS guarantees only admins get data
async function stats() {
  const c = async s => { let q = sb.from("orders").select("id", { count: "exact", head: true }); if (s) q = q.eq("status", s); return (await q).count ?? 0; };
  const v = await Promise.all([c(), c("Pending"), c("In Progress"), c("Completed"), c("Cancelled")]);
  $("#stats").innerHTML = ["Total","Pending","In Progress","Completed","Cancelled"].map((n, i) => `<div class="card"><span class="muted">${n}</span><span class="stat">${v[i]}</span></div>`).join("");
}
async function loadSvcs() { const { data, error } = await sb.from("services").select("*").order("created_at"); if (error) return toast("Could not load services", true);
  svcList = data; $("#fs").innerHTML = "<option value=''>All services</option>" + data.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join(""); }
async function list(quiet) {
  let q = sb.from("orders").select("*", { count: "exact" }).order("created_at", { ascending: $("#so").value === "asc" }).range(page * PAGE, page * PAGE + PAGE - 1);
  const t = $("#q").value.replace(/[,()%*\\]/g, " ").trim(); if (t) q = q.or(`customer_name.ilike.%${t}%,order_number.ilike.%${t}%`);
  if ($("#fs").value) q = q.eq("service_id", $("#fs").value); if ($("#fst").value) q = q.eq("status", $("#fst").value);
  const { data, count, error } = await q; if (error) return quiet || toast("Could not load orders", true);
  rowsData = data; total = count ?? 0; $("#pg").textContent = `Page ${page + 1} of ${Math.max(1, Math.ceil(total / PAGE))} (${total})`;
  const sn = id => svcList.find(s => s.id === id)?.name ?? "";
  $("#rows").innerHTML = data.map(o => `<tr data-id="${esc(o.id)}"><td>${esc(o.order_number)}</td><td>${esc(o.customer_name)}</td><td>${esc(sn(o.service_id))}</td><td>${esc(o.status)}</td><td>${new Date(o.created_at).toLocaleString()}</td></tr>`).join("")
    || `<tr><td colspan="5" class="muted">No orders found.</td></tr>`;
  $("#rows").querySelectorAll("tr[data-id]").forEach(r => r.onclick = () => detail(rowsData.find(o => o.id === r.dataset.id)));
}
function detail(o) {
  const d = $("#detail"), contact = o.customer_email || o.customer_phone;
  d.innerHTML = `<h3>${esc(o.order_number)} · ${esc(o.customer_name)}</h3>
  <div>Email: ${esc(o.customer_email || "-")} · Phone: ${esc(o.customer_phone || "-")}</div>
  <div>Preferred: <b>${esc(o.contact_platform)}</b> — ${esc(o.contact_information)}</div>
  <div class="muted" style="white-space:pre-wrap">${esc(o.project_description)}</div>
  <div class="muted" style="white-space:pre-wrap">${esc(o.additional_requirements || "")}</div>
  <label>Status<select id="ds">${ST.map(s => `<option${s === o.status ? " selected" : ""}>${s}</option>`).join("")}</select></label>
  <label>Admin notes<textarea id="dn" rows="3" maxlength="5000">${esc(o.admin_notes || "")}</textarea></label>
  <div><button class="btn sm" id="sv">SAVE</button> <button class="btn sm alt" id="c1">COPY ORDER ID</button> <button class="btn sm alt" id="c2">COPY CONTACT</button> <button class="btn sm danger" id="dl">DELETE</button></div>`;
  $("#sv").onclick = async () => { const { error } = await sb.from("orders").update({ status: $("#ds").value, admin_notes: $("#dn").value }).eq("id", o.id);
    error ? toast("Save failed", true) : (toast("Saved"), list(), stats()); };
  $("#c1").onclick = () => navigator.clipboard.writeText(o.order_number).then(() => toast("Copied"));
  $("#c2").onclick = () => navigator.clipboard.writeText(o.contact_information).then(() => toast("Copied"));
  $("#dl").onclick = async () => { if (!confirm(`Permanently delete ${o.order_number}?`)) return;
    const { error } = await sb.from("orders").delete().eq("id", o.id); if (error) return toast("Delete failed", true); d.innerHTML = ""; toast("Deleted"); list(); stats(); };
  d.scrollIntoView({ behavior: "smooth" });
}
function renderSvcs() {
  $("#svcs").innerHTML = svcList.map(s => `<div class="sv" data-id="${esc(s.id)}"><h3>${esc(s.name)}</h3>
  <label>Description<textarea class="d" rows="2">${esc(s.description)}</textarea></label>
  <label>Price (blank = Custom Quote)<input class="p" value="${esc(s.price || "")}" maxlength="60"></label>
  <label>Estimated delivery<input class="e" value="${esc(s.estimated_delivery || "")}" maxlength="60"></label>
  <label><span><input type="checkbox" class="a" ${s.is_active ? "checked" : ""} style="width:auto"> Active</span></label><button class="btn sm">SAVE</button></div>`).join("");
  $("#svcs").querySelectorAll(".sv").forEach(b => b.querySelector("button").onclick = async () => {
    const { error } = await sb.from("services").update({ description: b.querySelector(".d").value.trim(), price: b.querySelector(".p").value.trim() || null,
      estimated_delivery: b.querySelector(".e").value.trim() || null, is_active: b.querySelector(".a").checked }).eq("id", b.dataset.id);
    error ? toast("Save failed", true) : (toast("Service saved"), loadSvcs()); });
}

$("#tCm").onclick = e => { e.preventDefault(); $("#orders").hidden = true; $("#svcs").hidden = true; $("#cm").hidden = false; renderComments(); };
async function renderComments() {
  const { data, error } = await sb.from("comments").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return toast("Could not load comments", true);
  data.sort((x, y) => x.is_approved - y.is_approved); // pending first
  $("#cm").innerHTML = data.map(c => `<div class="sv" data-id="${esc(c.id)}"><h3>${esc(c.author_name)} <span class="muted">· ${c.is_approved ? "Approved" : "PENDING"} · ${new Date(c.created_at).toLocaleString()}</span></h3>
  <div style="white-space:pre-wrap">${esc(c.body)}</div><div>${c.is_approved ? "" : '<button class="btn sm ap">APPROVE</button> '}<button class="btn sm danger dl">DELETE</button></div></div>`).join("") || "<p class='muted'>No comments yet.</p>";
  $("#cm").querySelectorAll(".sv").forEach(b => {
    const id = b.dataset.id, ap = b.querySelector(".ap");
    if (ap) ap.onclick = async () => { const { error } = await sb.from("comments").update({ is_approved: true }).eq("id", id); error ? toast("Failed", true) : (toast("Approved"), renderComments()); };
    b.querySelector(".dl").onclick = async () => { if (!confirm("Delete this comment?")) return; const { error } = await sb.from("comments").delete().eq("id", id); error ? toast("Failed", true) : (toast("Deleted"), renderComments()); };
  });
}
