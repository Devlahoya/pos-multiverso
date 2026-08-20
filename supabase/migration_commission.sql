-- Ejecutar en Supabase -> SQL Editor si tu base de datos ya existía
-- antes de agregar la comisión de plataformas (Uber Eats, Didi Food, Rappi = 43%).

alter table public.orders
  add column if not exists commission_rate numeric not null default 0;
