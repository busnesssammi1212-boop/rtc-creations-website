# TECHNEX — setup guide
Static site (Vercel) + Supabase (Postgres, Auth, RLS, Edge Function `submit`).
Files: index.html (all public sections), admin/login.html, admin/dashboard.html, assets/, supabase/schema.sql, supabase/functions/submit/index.ts.

## 1. Supabase
1. Create a project at supabase.com. Note Project URL and anon/publishable key (Settings > API).
2. SQL Editor: paste and run `supabase/schema.sql` (tables, RLS, seed services).
3. Authentication > Users > Add user: `ayubsammi@gmail.com` with a STRONG password you choose (don't reuse the weak one from the brief; don't put it in code or chat). Disable public sign-ups: Authentication > Providers > Email > turn off "Allow new users to sign up".
4. Make that user admin (SQL Editor):
   `update public.profiles set role='admin' where id=(select id from auth.users where email='ayubsammi@gmail.com');`
5. Deploy the function: `npm i -g supabase`, `supabase login`, `supabase link --project-ref YOUR_REF`, `supabase functions deploy submit`.
   (Keep JWT verification on; the browser sends the anon key.)

## 2. Configure
Edit `assets/js/config.js`: URL, anon key, contact links, legal name, privacy email. These are public values. The service-role key is only used inside the Edge Function and never leaves Supabase.

## 3. Deploy
Push to GitHub (never commit secrets; `.gitignore` included), import repo in Vercel (framework: Other, no build), deploy. Add a domain in Vercel > Settings > Domains. Redeploy = push to GitHub.

## 4. Verify (checklist — none of this has been run yet)
- Home loads, services appear, "Order This Service" preselects the service.
- Invalid order is rejected; valid order shows TX-YYYY-NNNN and appears in admin.
- Logged out: `curl "$URL/rest/v1/orders" -H "apikey: $ANON"` returns an empty list/permission error.
- Non-admin login is rejected; admin can change status, notes, prices, delete (with confirm).
- Mobile layout (~375px) has no sideways scroll. Refresh keeps data.

## Security notes
Implemented: RLS, server-side validation, honeypot, per-contact rate limit (3 per 10 min), output escaping, no secrets in frontend, admin role only editable via SQL. Needs your config: HTTPS (Vercel automatic), CORS lock (`ALLOWED_ORIGIN`), CAPTCHA/IP-based limits if spam grows, email notifications (not included; messages are saved in `contact_messages`, viewable in the Supabase table editor).
Troubleshooting: "permission denied" = schema.sql not applied or user not admin; 401 on submit = wrong anon key; CORS error = function not deployed.
