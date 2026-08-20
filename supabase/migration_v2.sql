-- Ejecutar en Supabase -> SQL Editor (tu base de datos ya existe).
-- Agrega: folio de ticket, método de pago, categorías configurables
-- y configuración del negocio (comisiones editables, datos).

-- Folio consecutivo en pedidos ya existentes: se numeran por fecha de creación.
alter table public.orders add column if not exists folio bigint;
alter table public.orders add column if not exists payment_method text;

create sequence if not exists public.orders_folio_seq;
update public.orders o set folio = sub.rn
from (
  select id, row_number() over (order by created_at) as rn
  from public.orders
  where folio is null
) sub
where o.id = sub.id;
select setval('public.orders_folio_seq', coalesce((select max(folio) from public.orders), 0) + 1, false);
alter table public.orders alter column folio set default nextval('public.orders_folio_seq');
alter table public.orders alter column folio set not null;
alter sequence public.orders_folio_seq owned by public.orders.folio;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Multiverso — Boneless and Food',
  business_phone text,
  business_address text,
  commission_uber numeric not null default 0.43,
  commission_didi numeric not null default 0.43,
  commission_rappi numeric not null default 0.43,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

alter table public.categories enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "read categories" on public.categories;
create policy "read categories" on public.categories for select to authenticated using (true);
drop policy if exists "admin write categories" on public.categories;
create policy "admin write categories" on public.categories for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "read app_settings" on public.app_settings;
create policy "read app_settings" on public.app_settings for select to authenticated using (true);
drop policy if exists "admin write app_settings" on public.app_settings;
create policy "admin write app_settings" on public.app_settings for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
