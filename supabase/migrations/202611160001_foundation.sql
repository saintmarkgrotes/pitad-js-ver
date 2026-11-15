-- Phase 1 only. Activity and social schemas arrive with their owning features.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default 'Runner' check (char_length(display_name) between 2 and 60),
  distance_unit text not null default 'km' check (distance_unit in ('km', 'mi')),
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  period text not null check (period in ('week', 'month')),
  distance_meters numeric(12,2) not null check (distance_meters > 0 and distance_meters <= 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  push_token text unique check (char_length(push_token) between 1 and 512),
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_devices_user_id_idx on public.user_devices(user_id);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger user_goals_updated_at before update on public.user_goals
for each row execute function public.set_updated_at();
create trigger user_devices_updated_at before update on public.user_devices
for each row execute function public.set_updated_at();

-- Never derive authorization from user-editable metadata. Only the display
-- name is copied; uniqueness is handled later when the user chooses a username.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  requested_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  insert into public.profiles(id, display_name)
  values (new.id, case when char_length(requested_name) >= 2 then left(requested_name, 60) else 'Runner' end);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Cover users created before the migration as well as new registrations.
insert into public.profiles(id, display_name)
select id, case when char_length(btrim(coalesce(raw_user_meta_data ->> 'display_name', ''))) >= 2
  then left(btrim(raw_user_meta_data ->> 'display_name'), 60) else 'Runner' end
from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_devices enable row level security;

revoke all on public.profiles, public.user_goals, public.user_devices from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, username, distance_unit, is_private) on public.profiles to authenticated;
grant select, insert, update, delete on public.user_goals, public.user_devices to authenticated;

create policy profiles_select_owner on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_owner on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy goals_owner on public.user_goals for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy devices_owner on public.user_devices for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
commit;
