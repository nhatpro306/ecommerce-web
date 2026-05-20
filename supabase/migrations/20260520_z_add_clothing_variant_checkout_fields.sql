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
    when 'SL-TEE-001' then 'saigon-oversized-tee'
    when 'SL-HOO-002' then 'hanoi-minimal-hoodie'
    when 'SL-PAN-003' then 'vietnam-street-cargo-pants'
    when 'SL-ACC-004' then 'local-brand-cap'
    when 'SL-TEE-005' then 'basic-heavyweight-tee'
    when 'SL-TEE-006' then 'limited-dragon-graphic-tee'
    when 'SL-TEE-007' then 'district-1-boxy-tee'
    when 'SL-HOO-008' then '84-club-hoodie'
    else slug
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
