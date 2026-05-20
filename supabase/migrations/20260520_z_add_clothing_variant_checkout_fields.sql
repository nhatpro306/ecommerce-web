alter table if exists public.products
add column if not exists slug text,
add column if not exists material text,
add column if not exists sizes text[] not null default array[]::text[],
add column if not exists colors text[] not null default array[]::text[];

update public.products
set slug = lower(
  regexp_replace(
    regexp_replace(coalesce(sku, title), '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-|-$)',
    '',
    'g'
  )
)
where slug is null;

create unique index if not exists products_slug_unique_idx
on public.products (slug)
where slug is not null;

alter table if exists public.cart_items
add column if not exists selected_size text,
add column if not exists selected_color text,
add column if not exists variant_info jsonb not null default '{}'::jsonb;

alter table if exists public.order_items
add column if not exists selected_size text,
add column if not exists selected_color text,
add column if not exists variant_info jsonb not null default '{}'::jsonb;

alter table if exists public.orders
add column if not exists customer_name text,
add column if not exists customer_phone text,
add column if not exists customer_email text,
add column if not exists customer_note text;

update public.products
set
  slug = case sku
    when 'SL-TEE-001' then 'resey-oversized-tee'
    when 'SL-HOO-002' then 'resey-minimal-hoodie'
    when 'SL-PAN-003' then 'resey-street-cargo-pants'
    when 'SL-ACC-004' then 'resey-logo-cap'
    when 'SL-TEE-005' then 'resey-heavyweight-tee'
    when 'SL-TEE-006' then 'resey-dragon-graphic-tee'
    when 'SL-TEE-007' then 'resey-boxy-tee'
    when 'SL-HOO-008' then 'resey-club-hoodie'
    else slug
  end,
  title = case sku
    when 'SL-TEE-001' then 'RESEY Oversized Tee'
    when 'SL-HOO-002' then 'RESEY Minimal Hoodie'
    when 'SL-PAN-003' then 'RESEY Street Cargo Pants'
    when 'SL-ACC-004' then 'RESEY Logo Cap'
    when 'SL-TEE-005' then 'RESEY Heavyweight Tee'
    when 'SL-TEE-006' then 'RESEY Dragon Graphic Tee'
    when 'SL-TEE-007' then 'RESEY Boxy Tee'
    when 'SL-HOO-008' then 'RESEY Club Hoodie'
    else title
  end,
  description = case sku
    when 'SL-TEE-001' then 'Áo thun form rộng cho streetwear hằng ngày.'
    when 'SL-HOO-002' then 'Hoodie nỉ dày, tối giản, giữ form tốt.'
    when 'SL-PAN-003' then 'Cargo pants utility fit, thoải mái khi di chuyển.'
    when 'SL-ACC-004' then 'Nón lưỡi trai basic tone đen/trắng.'
    when 'SL-TEE-005' then 'Áo thun heavy cotton, chất dày, đứng form.'
    when 'SL-TEE-006' then 'Graphic tee phiên bản giới hạn.'
    when 'SL-TEE-007' then 'Boxy tee với form rộng, gọn và dễ phối đồ.'
    when 'SL-HOO-008' then 'Hoodie signature của RESEY.'
    else description
  end,
  material = case sku
    when 'SL-TEE-001' then 'Cotton 240gsm'
    when 'SL-HOO-002' then 'French terry cotton blend'
    when 'SL-PAN-003' then 'Cotton twill'
    when 'SL-ACC-004' then 'Cotton canvas'
    when 'SL-TEE-005' then 'Heavyweight cotton 260gsm'
    when 'SL-TEE-006' then 'Cotton jersey'
    when 'SL-TEE-007' then 'Compact cotton'
    when 'SL-HOO-008' then 'Brushed fleece'
    else coalesce(material, 'Cotton blend')
  end,
  sizes = case
    when sku like 'SL-ACC-%' then array['Free Size']::text[]
    else array['S', 'M', 'L', 'XL']::text[]
  end,
  colors = case
    when sku like 'SL-ACC-%' then array['Black', 'White', 'Beige']::text[]
    else array['Black', 'White', 'Gray']::text[]
  end,
  image = case sku
    when 'SL-TEE-001' then 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'
    when 'SL-HOO-002' then 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80'
    when 'SL-PAN-003' then 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80'
    when 'SL-ACC-004' then 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80'
    when 'SL-TEE-005' then 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80'
    when 'SL-TEE-006' then 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80'
    when 'SL-TEE-007' then 'https://images.unsplash.com/photo-1506629905607-d405b7a30db9?auto=format&fit=crop&w=900&q=80'
    when 'SL-HOO-008' then 'https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=900&q=80'
    else image
  end
where sku in (
  'SL-TEE-001',
  'SL-HOO-002',
  'SL-PAN-003',
  'SL-ACC-004',
  'SL-TEE-005',
  'SL-TEE-006',
  'SL-TEE-007',
  'SL-HOO-008'
);
