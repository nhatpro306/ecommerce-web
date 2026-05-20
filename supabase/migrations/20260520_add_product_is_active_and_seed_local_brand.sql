alter table if exists public.products
add column if not exists is_active boolean not null default true;

insert into public.categories (name, description)
values
  ('T-Shirts', 'Saigon Local T-Shirts'),
  ('Hoodies', 'Saigon Local Hoodies'),
  ('Pants', 'Saigon Local Pants'),
  ('Accessories', 'Saigon Local Accessories')
on conflict do nothing;

with c as (
  select id, name from public.categories
)
insert into public.products (title, description, price, stock, category_id, sku, image, is_active)
select * from (
  values
    (
      'Saigon Oversized Tee',
      'Áo thun form rộng streetwear hằng ngày.',
      450000,
      40,
      'T-Shirts',
      'SL-TEE-001',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
      true
    ),
    (
      'Hanoi Minimal Hoodie',
      'Hoodie nỉ dày, tối giản, giữ form tốt.',
      790000,
      24,
      'Hoodies',
      'SL-HOO-002',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80',
      true
    ),
    (
      'Vietnam Street Cargo Pants',
      'Cargo pants utility fit, thoải mái di chuyển.',
      920000,
      18,
      'Pants',
      'SL-PAN-003',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
      true
    ),
    (
      'Local Brand Cap',
      'Nón lưỡi trai basic tone đen/trắng.',
      320000,
      60,
      'Accessories',
      'SL-ACC-004',
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80',
      true
    ),
    (
      'Basic Heavyweight Tee',
      'Áo thun heavy cotton, chất dày, đứng form.',
      520000,
      30,
      'T-Shirts',
      'SL-TEE-005',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80',
      true
    ),
    (
      'Limited Dragon Graphic Tee',
      'Graphic tee phiên bản giới hạn.',
      680000,
      12,
      'T-Shirts',
      'SL-TEE-006',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80',
      true
    ),
    (
      'District 1 Boxy Tee',
      'Boxy tee cảm hứng Sài Gòn trung tâm.',
      560000,
      22,
      'T-Shirts',
      'SL-TEE-007',
      'https://images.unsplash.com/photo-1506629905607-d405b7a30db9?auto=format&fit=crop&w=900&q=80',
      true
    ),
    (
      '84 Club Hoodie',
      'Hoodie local signature của SAIGON LOCAL.',
      850000,
      14,
      'Hoodies',
      'SL-HOO-008',
      'https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=900&q=80',
      true
    )
) as v(title, description, price, stock, category_name, sku, image, is_active)
join c on c.name = v.category_name
where not exists (
  select 1 from public.products p where p.sku = v.sku
);
