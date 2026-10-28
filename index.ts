// Edge Function "submit": validates + rate-limits public orders and contact messages.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase; never ship them to the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Content-Type": "application/json" };
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, PHONE = /^[+()\d\s-]{6,30}$/;
const PLATFORMS = ["Discord", "Telegram", "Email", "Phone", "Other"];
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);
  let b: any; try { b = await req.json(); } catch { return out({ error: "Invalid JSON" }, 400); }
  if (b.website) return out({ ok: true });                      // honeypot: bots fill this
  const since = new Date(Date.now() - 10 * 60_000).toISOString();

  if (b.type === "contact") {
    const name = s(b.name, 100), email = s(b.email, 254), message = s(b.message, 3000);
    if (!name || !EMAIL.test(email) || message.length < 5) return out({ error: "Check name, email and message." }, 400);
    const { count } = await db.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
    if ((count ?? 0) >= 3) return out({ error: "Too many messages. Try again later." }, 429);
    const { error } = await db.from("contact_messages").insert({ name, email, message });
    return error ? out({ error: "Could not save your message." }, 500) : out({ ok: true });
  }

  const o = { customer_name: s(b.name, 100), customer_email: s(b.email, 254) || null, customer_phone: s(b.phone, 30) || null,
    contact_platform: s(b.platform, 20), contact_information: s(b.contact, 150), service_id: s(b.service_id, 60),
    project_description: s(b.description, 3000), additional_requirements: s(b.extra, 2000) || null };
  if (!o.customer_name) return out({ error: "Name is required." }, 400);
  if (!o.customer_email && !o.customer_phone) return out({ error: "Provide an email or phone number." }, 400);
  if (o.customer_email && !EMAIL.test(o.customer_email)) return out({ error: "Invalid email address." }, 400);
  if (o.customer_phone && !PHONE.test(o.customer_phone)) return out({ error: "Invalid phone number." }, 400);
  if (!PLATFORMS.includes(o.contact_platform)) return out({ error: "Choose a contact platform." }, 400);
  if (!o.contact_information) return out({ error: "Contact information is required." }, 400);
  if (o.project_description.length < 10) return out({ error: "Describe your project (10+ characters)." }, 400);

  const { data: svc } = await db.from("services").select("id").eq("id", o.service_id).eq("is_active", true).maybeSingle();
  if (!svc) return out({ error: "Selected service is unavailable." }, 400);
  const col = o.customer_email ? "customer_email" : "customer_phone";
  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq(col, (o as any)[col]).gte("created_at", since);
  if ((count ?? 0) >= 3) return out({ error: "Too many orders from this contact. Try again later." }, 429);

  const { data, error } = await db.from("orders").insert(o).select("order_number").single();
  if (error || !data) return out({ error: "Could not save your order. Please try again." }, 500);
  return out({ ok: true, order_number: data.order_number });
});
