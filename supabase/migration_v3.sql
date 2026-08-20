-- Ejecutar en Supabase -> SQL Editor (tu base de datos ya existe).
-- Agrega foto por artículo (Supabase Storage, bucket público "articles").

alter table public.articles add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('articles', 'articles', true)
on conflict (id) do nothing;

drop policy if exists "public read article images" on storage.objects;
create policy "public read article images" on storage.objects
  for select to public using (bucket_id = 'articles');

drop policy if exists "admin upload article images" on storage.objects;
create policy "admin upload article images" on storage.objects
  for insert to authenticated with check (bucket_id = 'articles' and public.my_role() = 'admin');

drop policy if exists "admin update article images" on storage.objects;
create policy "admin update article images" on storage.objects
  for update to authenticated using (bucket_id = 'articles' and public.my_role() = 'admin');

drop policy if exists "admin delete article images" on storage.objects;
create policy "admin delete article images" on storage.objects
  for delete to authenticated using (bucket_id = 'articles' and public.my_role() = 'admin');
