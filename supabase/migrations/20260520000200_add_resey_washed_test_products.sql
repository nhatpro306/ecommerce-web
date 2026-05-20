-- Add RESEY lookbook test products with local images, sizes, and colors.
-- Safe to run multiple times: existing SKUs are updated, missing SKUs are inserted.

insert into public.categories (name, description)
values
  ('T-Shirts', 'RESEY T-Shirts'),
  ('Hoodies', 'RESEY Hoodies'),
  ('Pants', 'RESEY Pants'),
  ('Accessories', 'RESEY Accessories')
on conflict (name) do update
set description = excluded.description;

with product_seed as (
  select * from (values
    (
      'RS-TEE-101',
      'resey-washed-tee-brown',
      'RESEY Washed Tee - Brown',
      'Áo thun wash màu nâu, form boxy rộng, logo chìm và đường ráp lệch tạo điểm nhấn streetwear.',
      'Washed cotton 250gsm',
      590000::numeric,
      36,
      'T-Shirts',
      '/products/resey-washed-tee-brown-fit-02.jpg',
      array['S', 'M', 'L', 'XL']::text[],
      array['Brown', 'Dust Brown', 'Olive']::text[]
    ),
    (
      'RS-TEE-102',
      'resey-washed-tee-brown-crop-fit',
      'RESEY Brown Washed Crop Fit',
      'Phiên bản fit ngắn hơn cho outfit layer, chất cotton wash mềm và màu nâu vintage dễ phối.',
      'Washed cotton 240gsm',
      560000::numeric,
      28,
      'T-Shirts',
      '/products/resey-washed-tee-brown-fit-03.jpg',
      array['S', 'M', 'L']::text[],
      array['Brown', 'Dust Brown']::text[]
    ),
    (
      'RS-TEE-103',
      'resey-washed-tee-olive',
      'RESEY Washed Tee - Olive',
      'Áo thun wash màu olive xám, form rộng, hợp phối với quần trắng, denim hoặc cargo.',
      'Washed cotton 250gsm',
      590000::numeric,
      32,
      'T-Shirts',
      '/products/resey-washed-tee-olive-fit-01.jpg',
      array['S', 'M', 'L', 'XL']::text[],
      array['Olive', 'Dust Gray', 'Brown']::text[]
    ),
    (
      'RS-SET-104',
      'resey-washed-tee-street-set',
      'RESEY Washed Tee Street Set',
      'Set phối áo wash nâu cùng quần ống rộng, phù hợp lookbook và outfit đường phố hằng ngày.',
      'Washed cotton tee / cotton twill pants',
      1190000::numeric,
      16,
      'T-Shirts',
      '/products/resey-washed-tee-brown-fit-01.jpg',
      array['S', 'M', 'L', 'XL']::text[],
      array['Brown', 'Cream']::text[]
    ),
    (
      'RS-PAN-105',
      'resey-wide-leg-cream-pants',
      'RESEY Wide Leg Pants - Cream',
      'Quần ống rộng màu cream, dáng rũ, dễ phối với các dòng tee wash của RESEY.',
      'Cotton twill',
      760000::numeric,
      20,
      'Pants',
      '/products/resey-washed-tee-brown-fit-05.jpg',
      array['S', 'M', 'L', 'XL']::text[],
      array['Cream', 'White']::text[]
    ),
    (
      'RS-PAN-106',
      'resey-wide-leg-dust-pants',
      'RESEY Wide Leg Pants - Dust Gray',
      'Quần ống rộng wash bụi, dáng streetwear mạnh, phối tốt với áo nâu hoặc olive.',
      'Washed cotton twill',
      790000::numeric,
      18,
      'Pants',
      '/products/resey-washed-tee-brown-fit-04.jpg',
      array['S', 'M', 'L', 'XL']::text[],
      array['Dust Gray', 'Brown']::text[]
    )
  ) as v(sku, slug, title, description, material, price, stock, category_name, image, sizes, colors)
), normalized_seed as (
  select
    product_seed.sku,
    product_seed.slug,
    product_seed.title,
    product_seed.description,
    product_seed.material,
    product_seed.price,
    product_seed.stock,
    categories.id as category_id,
    product_seed.image,
    product_seed.sizes,
    product_seed.colors
  from product_seed
  join public.categories categories on categories.name = product_seed.category_name
)
insert into public.products (
  sku,
  slug,
  title,
  description,
  material,
  price,
  stock,
  category_id,
  image,
  sizes,
  colors,
  is_active
)
select
  sku,
  slug,
  title,
  description,
  material,
  price,
  stock,
  category_id,
  image,
  sizes,
  colors,
  true
from normalized_seed
on conflict (sku) do update
set
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  material = excluded.material,
  price = excluded.price,
  stock = excluded.stock,
  category_id = excluded.category_id,
  image = excluded.image,
  sizes = excluded.sizes,
  colors = excluded.colors,
  is_active = true,
  updated_at = now();
