-- ============================================================
-- MULTIVERSO POS — Esquema de base de datos (Supabase/Postgres)
-- Pegar completo en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ---------- Tablas ----------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  image_url text,
  cost numeric not null default 0,          -- costo de producción
  price_sitio numeric,                       -- null = no se vende en ese canal
  price_uber numeric,
  price_didi numeric,
  price_rappi numeric,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  folio bigint generated always as identity,   -- folio consecutivo para el ticket
  channel text not null check (channel in ('sitio', 'uber', 'didi', 'rappi')),
  total numeric not null default 0,
  cost_total numeric not null default 0,
  commission_rate numeric not null default 0,  -- ej. 0.43 = plataforma se queda 43%
  payment_method text,                          -- efectivo, tarjeta, transferencia (canal Sitio)
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  article_id uuid references public.articles (id) on delete set null,
  article_name text not null,               -- snapshot del nombre
  qty integer not null default 1,
  unit_price numeric not null default 0,    -- snapshot del precio al vender
  unit_cost numeric not null default 0      -- snapshot del costo al vender
);

create table public.supplies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity numeric,
  unit text,
  total_cost numeric not null default 0,
  supplier text,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  type text not null default 'gasto' check (type in ('gasto', 'egreso')),
  category text,
  amount numeric not null default 0,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Fila única con la configuración general del negocio
create table public.app_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Multiverso — Boneless and Food',
  business_phone text,
  business_address text,
  commission_uber numeric not null default 0.43,
  commission_didi numeric not null default 0.43,
  commission_rappi numeric not null default 0.43,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (true);

create index orders_created_at_idx on public.orders (created_at);
create index order_items_order_idx on public.order_items (order_id);
create index supplies_date_idx on public.supplies (date);
create index expenses_date_idx on public.expenses (date);

-- ---------- Perfil automático al registrarse ----------
-- El PRIMER usuario registrado queda como admin; los demás como viewer.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when not exists (select 1 from public.profiles) then 'admin' else 'viewer' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Seguridad (RLS) ----------

create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.supplies enable row level security;
alter table public.expenses enable row level security;
alter table public.categories enable row level security;
alter table public.app_settings enable row level security;

-- Todos los usuarios autenticados pueden LEER todo
create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "read articles" on public.articles for select to authenticated using (true);
create policy "read orders" on public.orders for select to authenticated using (true);
create policy "read order_items" on public.order_items for select to authenticated using (true);
create policy "read supplies" on public.supplies for select to authenticated using (true);
create policy "read expenses" on public.expenses for select to authenticated using (true);
create policy "read categories" on public.categories for select to authenticated using (true);
create policy "read app_settings" on public.app_settings for select to authenticated using (true);

-- Solo ADMIN puede escribir
create policy "admin write articles" on public.articles for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "admin write orders" on public.orders for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "admin write order_items" on public.order_items for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "admin write supplies" on public.supplies for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "admin write expenses" on public.expenses for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "admin write categories" on public.categories for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "admin write app_settings" on public.app_settings for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Solo admin puede cambiar roles de otros
create policy "admin update profiles" on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- ---------- Fotos de artículos (Supabase Storage) ----------

insert into storage.buckets (id, name, public)
values ('articles', 'articles', true)
on conflict (id) do nothing;

create policy "public read article images" on storage.objects
  for select to public using (bucket_id = 'articles');
create policy "admin upload article images" on storage.objects
  for insert to authenticated with check (bucket_id = 'articles' and public.my_role() = 'admin');
create policy "admin update article images" on storage.objects
  for update to authenticated using (bucket_id = 'articles' and public.my_role() = 'admin');
create policy "admin delete article images" on storage.objects
  for delete to authenticated using (bucket_id = 'articles' and public.my_role() = 'admin');
