alter table if exists public.products
add column if not exists is_active boolean not null default true;

insert into public.categories (name, description)
values
  ('T-Shirts', 'RESEY T-Shirts'),
  ('Hoodies', 'RESEY Hoodies'),
  ('Pants', 'RESEY Pants'),
  ('Accessories', 'RESEY Accessories')
on conflict do nothing;

with c as (
  select id, name from public.categories
)
insert into public.categories (name, description)
values
  ('T-Shirts', 'Streetwear T-Shirts'),
  ('Hoodies', 'Streetwear Hoodies'),
  ('Pants', 'Streetwear Pants'),
  ('Accessories', 'Streetwear Accessories')
on conflict (name) do nothing;

insert into public.products (
  title,
  slug,
  description,
  material,
  price,
  image,
  stock,
  sizes,
  colors,
  is_active,
  sku,
  category_id
)
values
  (
    'RESEY Tee Black',
    'resey-tee-black',
    'Vietnamese streetwear oversized tee',
    '100% cotton',
    390000,
    '/images/products/black-tee-fallback.jpg',
    20,
    array['M','L','XL'],
    array['Black'],
    true,
    'RESEY-TEE-BLACK',
    (select id from public.categories where name = 'T-Shirts' limit 1)
  ),
  (
    'RESEY Hoodie Gray',
    'resey-hoodie-gray',
    'Heavyweight streetwear hoodie',
    'Cotton fleece',
    790000,
    '/images/products/black-tee-fallback.jpg',
    12,
    array['M','L','XL'],
    array['Gray'],
    true,
    'RESEY-HOODIE-GRAY',
    (select id from public.categories where name = 'Hoodies' limit 1)
  )
on conflict (sku) do update
set
  title = excluded.title,
  slug = excluded.slug,
  description = excluded.description,
  material = excluded.material,
  price = excluded.price,
  image = excluded.image,
  stock = excluded.stock,
  sizes = excluded.sizes,
  colors = excluded.colors,
  is_active = excluded.is_active,
  category_id = excluded.category_id,
  updated_at = now();
