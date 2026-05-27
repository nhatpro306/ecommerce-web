-- Admin/public query indexes for product lists, variants, images, carts, and orders.

create index if not exists idx_products_active_created_at
  on public.products (is_active, created_at desc);

create index if not exists idx_products_active_category_created_at
  on public.products (is_active, category_id, created_at desc);

create index if not exists idx_products_stock
  on public.products (stock);

create index if not exists idx_product_variants_product_active_stock
  on public.product_variants (product_id, is_active, stock);

create index if not exists idx_product_images_product_primary_sort
  on public.product_images (product_id, is_primary desc, sort_order asc);

create index if not exists idx_orders_user_created_at
  on public.orders (user_id, created_at desc);

create index if not exists idx_orders_status_created_at
  on public.orders (status, created_at desc);
