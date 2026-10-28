-- TECHNEX schema + RLS. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique, description text not null,
  features text[] not null default '{}',
  price text, estimated_delivery text,           -- NULL price => "Custom Quote"
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create sequence public.order_seq;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('TX-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.order_seq')::text,4,'0')),
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  customer_email text check (char_length(customer_email) <= 254),
  customer_phone text check (char_length(customer_phone) <= 30),
  contact_platform text not null check (contact_platform in ('Discord','Telegram','Email','Phone','Other')),
  contact_information text not null check (char_length(contact_information) between 1 and 150),
  service_id uuid not null references public.services(id) on delete restrict,
  project_description text not null check (char_length(project_description) between 10 and 3000),
  additional_requirements text check (char_length(additional_requirements) <= 2000),
  status text not null default 'Pending' check (status in ('Pending','Reviewed','In Progress','Completed','Cancelled')),
  admin_notes text check (char_length(admin_notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_email is not null or customer_phone is not null)
);
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) <= 254),
  message text not null check (char_length(message) between 5 and 3000),
  created_at timestamptz not null default now()
);
create index on public.orders (status, created_at desc);
create index on public.orders (service_id);
create index on public.orders (customer_email, created_at);

create function public.touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger t1 before update on public.profiles for each row execute function public.touch();
create trigger t2 before update on public.services for each row execute function public.touch();
create trigger t3 before update on public.orders   for each row execute function public.touch();

-- Role lives in profiles; users have NO insert/update policy on it, so they cannot self-promote.
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;
create function public.on_signup() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, split_part(new.email,'@',1)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.on_signup();

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.contact_messages enable row level security;

-- Orders/contacts are written ONLY by the Edge Function (service role). Anon gets nothing on them.
revoke all on public.orders, public.contact_messages, public.profiles from anon;
revoke insert on public.orders, public.contact_messages, public.profiles from authenticated;
revoke update on public.profiles from authenticated;
revoke insert, update, delete on public.services from anon;

create policy "services read" on public.services for select using (is_active or public.is_admin());
create policy "services admin write" on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy "profile read own" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "orders admin" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "contact admin" on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

insert into public.services (name, slug, description, features) values
('Custom Discord Bot','discord-bot','Custom Discord bots for server management, moderation, automation, utility commands, and community engagement.',
 '{"Moderation commands","Ticket systems","Welcome messages","Role management","Logging","Custom commands","Database integration"}'),
('Discord Server Setup','discord-server-setup','Professional Discord server configuration for communities, gaming groups, creators, and online businesses.',
 '{"Server structure","Roles and permissions","Channel configuration","Moderation setup","Ticket and welcome systems","Bot integration"}'),
('Telegram Bot Development','telegram-bot','Custom Telegram bots for automation, notifications, community management, and other legitimate use cases.',
 '{"Custom commands","Automated replies","Notifications","Database integration","Admin controls","API integrations"}'),
('Website Development','website','Modern, responsive websites for personal brands, creators, communities, and businesses.',
 '{"Landing pages","Business and portfolio sites","Admin dashboards","User authentication","Contact forms","Custom features"}'),
('Website with Database and Hosting','website-database-hosting','Complete website solutions with database integration, hosting configuration, and deployment assistance.',
 '{"Website development","PostgreSQL database","User authentication","Admin dashboard","Hosting configuration","Deployment support","Maintenance options"}');
-- FIRST ADMIN (run AFTER creating the user in Authentication > Users):
-- update public.profiles set role='admin' where id = (select id from auth.users where email='ayubsammi@gmail.com');
