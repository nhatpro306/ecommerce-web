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
    when 'SL-TEE-001' then 'ﾃ｛ thun form r盻冢g cho streetwear h蘯ｱng ngﾃy.'
    when 'SL-HOO-002' then 'Hoodie n盻・dﾃy, t盻訴 gi蘯｣n, gi盻ｯ form t盻奏.'
    when 'SL-PAN-003' then 'Cargo pants utility fit, tho蘯｣i mﾃ｡i khi di chuy盻ハ.'
    when 'SL-ACC-004' then 'Nﾃｳn lﾆｰ盻｡i trai basic tone ﾄ粗n/tr蘯ｯng.'
    when 'SL-TEE-005' then 'ﾃ｛ thun heavy cotton, ch蘯･t dﾃy, ﾄ黛ｻｩng form.'
    when 'SL-TEE-006' then 'Graphic tee phiﾃｪn b蘯｣n gi盻嬖 h蘯｡n.'
    when 'SL-TEE-007' then 'Boxy tee v盻嬖 form r盻冢g, g盻肱 vﾃ d盻・ph盻訴 ﾄ黛ｻ・'
    when 'SL-HOO-008' then 'Hoodie signature c盻ｧa RESEY.'
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
    when 'SL-TEE-001' then '/images/products/black-tee-fallback.jpg'
    when 'SL-HOO-002' then '/images/products/black-tee-fallback.jpg'
    when 'SL-PAN-003' then '/images/products/black-tee-fallback.jpg'
    when 'SL-ACC-004' then '/images/products/black-tee-fallback.jpg'
    when 'SL-TEE-005' then '/images/products/black-tee-fallback.jpg'
    when 'SL-TEE-006' then '/images/products/black-tee-fallback.jpg'
    when 'SL-TEE-007' then '/images/products/black-tee-fallback.jpg'
    when 'SL-HOO-008' then '/images/products/black-tee-fallback.jpg'
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

