-- Atomically replace product image metadata and keep products.image in sync.
-- Requires admin profile via private.is_admin(auth.uid()).

create or replace function public.sync_product_images(
  p_product_id uuid,
  p_images jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  image_item jsonb;
  image_index integer := 0;
  has_primary boolean := false;
  current_is_primary boolean;
  primary_url text := null;
begin
  if auth.uid() is null or not private.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  if p_product_id is null then
    raise exception 'Missing product id';
  end if;

  if jsonb_typeof(p_images) is distinct from 'array' or jsonb_array_length(p_images) = 0 then
    raise exception 'At least one product image is required';
  end if;

  if not exists (select 1 from public.products where product_id = p_product_id) then
    raise exception 'Product not found';
  end if;

  delete from public.product_images where product_id = p_product_id;

  for image_item in select value from jsonb_array_elements(p_images)
  loop
    image_index := image_index + 1;

    if nullif(trim(coalesce(image_item->>'url', '')), '') is null then
      raise exception 'Product image URL is required';
    end if;

    current_is_primary := coalesce((image_item->>'is_primary')::boolean, false);
    if current_is_primary and has_primary then
      current_is_primary := false;
    end if;
    if image_index = 1 and not exists (
      select 1
      from jsonb_array_elements(p_images) as candidate
      where coalesce((candidate.value->>'is_primary')::boolean, false)
    ) then
      current_is_primary := true;
    end if;

    if current_is_primary then
      has_primary := true;
      primary_url := trim(image_item->>'url');
    end if;

    insert into public.product_images (
      product_id,
      url,
      alt_text,
      sort_order,
      is_primary
    ) values (
      p_product_id,
      trim(image_item->>'url'),
      nullif(trim(coalesce(image_item->>'alt_text', '')), ''),
      coalesce((image_item->>'sort_order')::integer, image_index - 1),
      current_is_primary
    );
  end loop;

  if primary_url is null then
    select url into primary_url
    from public.product_images
    where product_id = p_product_id
    order by sort_order asc, id asc
    limit 1;

    update public.product_images
    set is_primary = true
    where product_id = p_product_id
      and url = primary_url;
  end if;

  update public.products
  set image = primary_url,
      updated_at = now()
  where product_id = p_product_id;
end;
$$;

revoke all on function public.sync_product_images(uuid, jsonb) from public;
grant execute on function public.sync_product_images(uuid, jsonb) to authenticated, service_role;
