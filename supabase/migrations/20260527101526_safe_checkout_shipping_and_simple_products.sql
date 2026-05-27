alter table public.orders
add column if not exists shipping_fee numeric(12, 2) not null default 0;

create or replace function public.create_order_checkout(payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  shipping_address_id_value integer := (payload->>'shipping_address_id')::integer;
  payment_method_value text := coalesce(payload->>'payment_method', 'cod');
  payment_id_value text := nullif(payload->>'payment_id', '');
  cart_id_value integer := nullif(payload->>'cart_id', '')::integer;
  created_order_id integer;
  subtotal_amount numeric(12, 2) := 0;
  configured_shipping_fee numeric(12, 2) := 0;
  free_shipping_threshold_value numeric(12, 2);
  final_shipping_fee numeric(12, 2) := 0;
  item jsonb;
  item_quantity integer;
  item_product_id uuid;
  item_variant_id uuid;
  item_size text;
  item_color text;
  active_variant_count integer := 0;
  matched_variant boolean := false;
  matched_product boolean := false;
  variant_record record;
  product_record record;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.addresses a
    where a.id = shipping_address_id_value
      and a.user_id = current_user_id
  ) then
    raise exception 'Shipping address does not belong to current user';
  end if;

  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Checkout requires at least one item';
  end if;

  select
    greatest(0, coalesce(ss.shipping_fee, 0)),
    ss.free_shipping_threshold
  into configured_shipping_fee, free_shipping_threshold_value
  from public.store_settings ss
  where ss.id = 1;

  configured_shipping_fee := coalesce(configured_shipping_fee, 0);

  insert into public.orders (
    user_id,
    status,
    total,
    shipping_fee,
    shipping_address_id,
    payment_method,
    payment_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_note
  ) values (
    current_user_id,
    'pending',
    0,
    0,
    shipping_address_id_value,
    payment_method_value,
    payment_id_value,
    nullif(payload->>'customer_name', ''),
    nullif(payload->>'customer_phone', ''),
    nullif(payload->>'customer_email', ''),
    nullif(payload->>'customer_note', '')
  ) returning id into created_order_id;

  for item in select * from jsonb_array_elements(payload->'items') loop
    item_quantity := greatest(1, coalesce((item->>'quantity')::integer, 1));
    item_size := coalesce(nullif(item->>'selected_size', ''), nullif(item->>'size', ''));
    item_color := coalesce(nullif(item->>'selected_color', ''), nullif(item->>'color', ''));
    item_variant_id := nullif(item->>'variant_id', '')::uuid;
    item_product_id := nullif(item->>'product_id', '')::uuid;
    active_variant_count := 0;
    matched_variant := false;
    matched_product := false;

    if item_product_id is null and item_variant_id is null then
      raise exception 'Checkout item is missing product_id';
    end if;

    if item_variant_id is not null then
      select
        pv.id,
        pv.product_id,
        pv.size,
        pv.color,
        pv.sku,
        pv.stock,
        coalesce(pv.price_override, p.price) as unit_price,
        coalesce(pv.image_url, p.image) as image_url,
        p.title as product_title
      into variant_record
      from public.product_variants pv
      join public.products p on p.product_id = pv.product_id
      where pv.id = item_variant_id
        and pv.is_active = true
        and p.is_active = true
      for update of pv;

      matched_variant := found;
    elsif item_size is not null and item_color is not null then
      select
        pv.id,
        pv.product_id,
        pv.size,
        pv.color,
        pv.sku,
        pv.stock,
        coalesce(pv.price_override, p.price) as unit_price,
        coalesce(pv.image_url, p.image) as image_url,
        p.title as product_title
      into variant_record
      from public.product_variants pv
      join public.products p on p.product_id = pv.product_id
      where pv.product_id = item_product_id
        and pv.size = item_size
        and pv.color = item_color
        and pv.is_active = true
        and p.is_active = true
      for update of pv;

      matched_variant := found;
    end if;

    if matched_variant then
      if variant_record.stock < item_quantity then
        raise exception 'Not enough stock for % / %', variant_record.size, variant_record.color;
      end if;

      update public.product_variants
      set stock = stock - item_quantity, updated_at = now()
      where id = variant_record.id;

      insert into public.order_items (
        order_id,
        product_id,
        variant_id,
        quantity,
        price,
        selected_size,
        selected_color,
        variant_info,
        product_title_snapshot,
        product_image_snapshot,
        sku_snapshot,
        size_snapshot,
        color_snapshot
      ) values (
        created_order_id,
        variant_record.product_id,
        variant_record.id,
        item_quantity,
        variant_record.unit_price,
        variant_record.size,
        variant_record.color,
        jsonb_build_object(
          'variant_id', variant_record.id,
          'sku', variant_record.sku,
          'size', variant_record.size,
          'color', variant_record.color
        ),
        variant_record.product_title,
        variant_record.image_url,
        variant_record.sku,
        variant_record.size,
        variant_record.color
      );

      subtotal_amount := subtotal_amount + (variant_record.unit_price * item_quantity);
    else
      select count(*)
      into active_variant_count
      from public.product_variants pv
      join public.products p on p.product_id = pv.product_id
      where pv.product_id = item_product_id
        and pv.is_active = true
        and p.is_active = true;

      if active_variant_count > 0 then
        raise exception 'Variant is no longer available';
      end if;

      select
        p.product_id,
        p.title,
        p.image,
        p.sku,
        p.price,
        p.stock
      into product_record
      from public.products p
      where p.product_id = item_product_id
        and p.is_active = true
      for update of p;

      matched_product := found;

      if not matched_product then
        raise exception 'Product is no longer available';
      end if;

      if product_record.stock < item_quantity then
        raise exception 'Not enough stock for product';
      end if;

      update public.products
      set stock = stock - item_quantity, updated_at = now()
      where product_id = product_record.product_id;

      insert into public.order_items (
        order_id,
        product_id,
        variant_id,
        quantity,
        price,
        selected_size,
        selected_color,
        variant_info,
        product_title_snapshot,
        product_image_snapshot,
        sku_snapshot,
        size_snapshot,
        color_snapshot
      ) values (
        created_order_id,
        product_record.product_id,
        null,
        item_quantity,
        product_record.price,
        item_size,
        item_color,
        jsonb_build_object(
          'sku', product_record.sku,
          'size', item_size,
          'color', item_color
        ),
        product_record.title,
        product_record.image,
        product_record.sku,
        item_size,
        item_color
      );

      subtotal_amount := subtotal_amount + (product_record.price * item_quantity);
    end if;
  end loop;

  final_shipping_fee := configured_shipping_fee;
  if free_shipping_threshold_value is not null
    and free_shipping_threshold_value > 0
    and subtotal_amount >= free_shipping_threshold_value
  then
    final_shipping_fee := 0;
  end if;

  update public.orders
  set
    shipping_fee = final_shipping_fee,
    total = subtotal_amount + final_shipping_fee,
    updated_at = now()
  where id = created_order_id;

  if cart_id_value is not null then
    update public.carts
    set status = 'converted', updated_at = now()
    where id = cart_id_value and user_id = current_user_id;
  else
    update public.carts
    set status = 'converted', updated_at = now()
    where user_id = current_user_id and status = 'active';
  end if;

  return created_order_id;
end;
$$;

revoke all on function public.create_order_checkout(jsonb) from public;
grant execute on function public.create_order_checkout(jsonb) to authenticated;
