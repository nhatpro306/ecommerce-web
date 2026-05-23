alter table if exists public.store_settings
add column if not exists slogan text,
add column if not exists hero_badge_text text,
add column if not exists hero_title text,
add column if not exists hero_subtitle text,
add column if not exists hero_image_url text,
add column if not exists hero_primary_button_text text,
add column if not exists hero_primary_button_url text,
add column if not exists hero_secondary_button_text text,
add column if not exists hero_secondary_button_url text,
add column if not exists announcement_text text,
add column if not exists story_title text,
add column if not exists story_description text,
add column if not exists instagram_url text,
add column if not exists tiktok_url text;

