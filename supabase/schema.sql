-- Ejecutar en SQL Editor de Supabase. Se puede volver a ejecutar.
-- Acceso público: no necesita Auth, correos ni SMTP.
begin;
create table if not exists public.public_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 90),
  author text not null check (char_length(btrim(author)) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  initial_votes bigint not null default 0 check(initial_votes >= 0)
);
create table if not exists public.public_votes (
  entry_id uuid not null references public.public_entries(id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(entry_id, visitor_id)
);
alter table public.public_entries enable row level security;
alter table public.public_votes enable row level security;
revoke all on public.public_entries, public.public_votes from anon, authenticated;
grant insert(id, title, author, body) on public.public_entries to anon, authenticated;
drop policy if exists publish_public_entry on public.public_entries;
create policy publish_public_entry on public.public_entries for insert to anon, authenticated with check(true);

create or replace function public.list_public_entries(visitor_id uuid default null)
returns table(id uuid, title text, author text, body text, created_at timestamptz, votes bigint, voted boolean)
language sql stable security definer set search_path = '' as $$
  select e.id, e.title, e.author, e.body, e.created_at,
    e.initial_votes + count(v.visitor_id),
    coalesce(bool_or(v.visitor_id = list_public_entries.visitor_id), false)
  from public.public_entries e left join public.public_votes v on v.entry_id = e.id
  group by e.id order by e.created_at desc, e.id;
$$;
create or replace function public.set_public_vote(entry_id uuid, visitor_id uuid, desired boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if visitor_id is null or desired is null then
    raise invalid_parameter_value using message = 'Visitor and vote state required';
  end if;
  if desired then
    insert into public.public_votes(entry_id, visitor_id)
    values (set_public_vote.entry_id, set_public_vote.visitor_id) on conflict do nothing;
  else
    delete from public.public_votes v where v.entry_id = set_public_vote.entry_id
      and v.visitor_id = set_public_vote.visitor_id;
  end if;
end;
$$;
revoke all on function public.list_public_entries(uuid), public.set_public_vote(uuid,uuid,boolean) from public;
grant execute on function public.list_public_entries(uuid), public.set_public_vote(uuid,uuid,boolean) to anon, authenticated;
commit;
