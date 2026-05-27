# Sonnet Task Brief — Verify + Harden Commit `aa180f8`

## Context

- Repo: `C:\Users\super\resey-shop`
- Branch hiện tại: `feat/phase-2-admin-dashboard` (HEAD `e767ac4`).
- Branch `main` đã có commit codex `aa180f8 fix auth lock and cart rls` + 12 commit khác. Local branch CHƯA rebase.
- Live site: https://resey.uk/
- Stack: Next.js App Router + Supabase + Vercel. Vietnamese e-commerce (RESEY streetwear).
- Read `CLAUDE.md` ở repo root TRƯỚC khi đụng code.

## Mục tiêu

Verify codex fix `aa180f8` (auth lock + cart RLS) chạy đúng production, đồng thời sửa 4 vấn đề audit phát hiện. KHÔNG redesign, KHÔNG refactor ngoài scope.

## Background facts

Codex sửa root cause: `onAuthStateChange` await DB write trong gotrue lock → block mọi REST call cùng tab. Fix: defer profile sync bằng `setTimeout(0)`. Đồng thời:
- Singleton browser client + Proxy bind `this`.
- Cart RLS: tách `carts_own_all` / `cart_items_own_all` (không phụ thuộc admin helper) khỏi admin policies.
- `cartService.ts` stop silent fallback `null/[]`, throw real error.

Migration mới: `supabase/migrations/20260526102031_repair_auth_lock_cart_rls.sql`.

## Việc cần làm — theo thứ tự

### 1. Sync local

```
git fetch origin
git checkout feat/phase-2-admin-dashboard
git rebase origin/main
```

Nếu conflict: resolve THEO HƯỚNG GIỮ commit main (codex fix) + giữ `docs/audit-report.md` local. Hỏi user nếu file `src/*` conflict.

### 2. Static check

```
npm install
npm run lint
npm run build
```

Phải pass cả 2. Nếu fail: report error, KHÔNG tự ý sửa.

### 3. Verify production Supabase (read-only SQL)

Dùng Supabase MCP tool `mcp__3bed8dd4-7f54-49c4-b8a2-b38618c2e2ac__execute_sql` với project ID lấy từ `list_projects`. Chạy từng query:

```sql
-- Q1: private.is_admin body
select pg_get_functiondef(p.oid) as def
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private' and p.proname = 'is_admin';

-- Q2: public.is_admin(uuid) còn tồn tại?
select pg_get_functiondef(p.oid) as def
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin';

-- Q3: grant trên is_admin
select routine_schema, routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_name = 'is_admin';

-- Q4: storage.objects policies bucket product-images
select policyname, cmd, qual, with_check
from pg_policies
where schemaname='storage' and tablename='objects'
order by policyname;

-- Q5: cart policies
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename in ('carts','cart_items')
order by tablename, policyname;

-- Q6: products + product_images policies
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename in ('products','product_images')
order by tablename, policyname;
```

Pass criteria:
- Q1: `private.is_admin` body **không** chứa `select public.is_admin`. Nếu có → flag fix #5.
- Q2: `public.is_admin(uuid)` còn tồn tại (production chưa replay).
- Q3: `anon` KHÔNG có execute trên `public.is_admin(uuid)`. Nếu có → flag fix #6.
- Q4: Có 3 policy admin (insert/update/delete) + 1 public_read trên bucket `product-images`. Nếu thiếu → flag fix #7.
- Q5: `carts_own_all` dùng `auth.uid() = user_id`; `cart_items_own_all` qua EXISTS `carts`.
- Q6: `products_read_active` cho phép `is_active=true OR private.is_admin(...)`.

Ghi kết quả mỗi query vào `docs/sonnet-verify-log.md`.

### 4. Verify untracked file

```
git status -s
```

Kiểm tra `supabase/migrations/20260524001000_repair_product_image_storage_policies.sql` tồn tại không. Nếu có:
- Read nội dung.
- So sánh với policies hiện trên prod (Q4).
- Nếu file đúng + prod thiếu storage policies → present diff cho user, hỏi có commit + apply không. KHÔNG tự commit.

### 5. Fix migration trap (nếu Q1 fail)

Nếu `private.is_admin` body wrap `public.is_admin`, tạo migration mới timestamp `20260527000000_inline_private_is_admin.sql`:

```sql
create or replace function private.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles
      where profile_id = user_id
        and role = 'admin'
        and is_active = true
    ),
    false
  );
$$;

grant execute on function private.is_admin(uuid) to anon, authenticated, service_role;
```

KHÔNG apply prod. Chỉ commit file + báo user.

### 6. Fix anon grant (nếu Q3 fail)

Nếu `anon` có execute `public.is_admin(uuid)`, thêm vào migration trên (hoặc tạo mới):

```sql
revoke execute on function public.is_admin(uuid) from anon;
```

### 7. Fix storage policies (nếu Q4 fail)

Nếu bucket `product-images` thiếu policy admin insert/update/delete, tạo migration mới timestamp `20260527000100_restore_product_image_storage_policies.sql`:

```sql
drop policy if exists "product_images_storage_public_read" on storage.objects;
create policy "product_images_storage_public_read"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "product_images_storage_admin_insert" on storage.objects;
create policy "product_images_storage_admin_insert"
on storage.objects for insert
with check (bucket_id = 'product-images' and private.is_admin((select auth.uid())));

drop policy if exists "product_images_storage_admin_update" on storage.objects;
create policy "product_images_storage_admin_update"
on storage.objects for update
using (bucket_id = 'product-images' and private.is_admin((select auth.uid())))
with check (bucket_id = 'product-images' and private.is_admin((select auth.uid())));

drop policy if exists "product_images_storage_admin_delete" on storage.objects;
create policy "product_images_storage_admin_delete"
on storage.objects for delete
using (bucket_id = 'product-images' and private.is_admin((select auth.uid())));
```

KHÔNG apply prod. Commit file + báo user.

### 8. Browser smoke test (live site)

Live https://resey.uk/. KHÔNG chạy local dev nếu user chưa yêu cầu.

Logout state:
- WebFetch hoặc browser MCP load `/`, `/products`, `/products/<slug-first>`, `/signin`.
- Verify: 200, không error, không "abc" trong hero (audit đã flag).

Login user thường (tạo account mới qua signup nếu user cho phép, hoặc skip nếu không có):
- Add cart → badge tăng → DB cart_items row create OK.
- Update quantity → DB update OK.
- Submit COD order → orders + order_items row.

Admin login `supermanzero30@gmail.com` (KHÔNG hardcode password trong code/log):
- /admin load < 5s.
- /admin/products list load.
- Upload thử 1 ảnh → 200. Nếu 403 → confirm fix #7 cần apply.
- /admin/orders load.

KHÔNG sửa data thật (đừng tạo product test mới, đừng đổi đơn thật).

### 9. Performance ghi nhận

Lighthouse hoặc đo bằng Network DevTools:
- `/` LCP, TTFB.
- `/products` LCP.
- `/admin` initial JS bundle.

Ghi vào `docs/sonnet-verify-log.md`. Mục tiêu LCP mobile < 2.5s.

### 10. RLS attack smoke (browser console, user thường login)

```js
const { data: stranger } = await supabase.from('carts').select('*').neq('user_id', currentUserId);
console.log('leak?', stranger);  // kỳ vọng []

const { error: e1 } = await supabase.from('products').update({price:1}).eq('product_id','<any>');
console.log('rls block?', e1);  // kỳ vọng có error hoặc 0 rows

const { error: e2 } = await supabase.storage.from('product-images').upload('hack.txt', new Blob(['x']));
console.log('upload blocked?', e2);  // kỳ vọng error
```

Ghi log.

## Output bắt buộc

File `docs/sonnet-verify-log.md`:

```
# Sonnet Verify Log

## 1. Sync local
- Rebase result:
- Conflicts: ...

## 2. Static
- lint: pass/fail
- build: pass/fail
- duration:

## 3. Supabase SQL
- Q1 private.is_admin body: [paste]
- Q2 public.is_admin(uuid) exists: yes/no
- Q3 grants: [table]
- Q4 storage policies: [list]
- Q5 cart policies: [list]
- Q6 product policies: [list]

## 4. Untracked migration file
- exists / content / matches prod / needs apply

## 5-7. Migrations created (if needed)
- file paths
- reason

## 8. Browser smoke
- logout: pass/fail
- user: pass/fail / skipped reason
- admin: pass/fail
- image upload: pass/fail/skip

## 9. Performance
- / LCP:
- /products LCP:
- /admin bundle:

## 10. RLS attack
- cart leak: yes/no
- product write blocked: yes/no
- storage upload blocked: yes/no

## Sign-off
- [ ] All pass
- [ ] Issues remaining: ...
- [ ] Files staged but NOT committed: ...
```

## Hard rules

1. KHÔNG `git commit`, KHÔNG `git push` trừ khi user duyệt từng commit.
2. KHÔNG apply migration lên Supabase prod. Chỉ tạo file + hỏi.
3. KHÔNG sửa `.env*`. KHÔNG log secret.
4. KHÔNG redesign UI. KHÔNG refactor ngoài 4 fix.
5. KHÔNG tự signup account hàng loạt trên live site.
6. KHÔNG đụng RLS policy đang hoạt động qua execute_sql write — chỉ read.
7. Mỗi action có blast-radius > local file edit → confirm user trước.
8. Stop và hỏi user nếu:
   - rebase conflict src code
   - Q1-Q6 fail cách bất ngờ
   - admin upload trả 403
   - migration trap thực sự cần apply prod

## Files đã có context

- `CLAUDE.md` — project rules
- `docs/audit-report.md` — audit gốc đã viết
- `CODEX_TASKS.md` — danh sách task cũ (untracked)
- `supabase/migrations/*.sql` — migration history

## Done definition

`docs/sonnet-verify-log.md` complete. 4 migration fix file (nếu cần) ở `supabase/migrations/` staged nhưng chưa commit. User review → quyết định commit + apply.
