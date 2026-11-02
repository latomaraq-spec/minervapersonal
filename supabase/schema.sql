-- Ejecutar una vez en el SQL Editor de un proyecto Supabase nuevo.
-- Cambiar el dominio por el correo corporativo REAL antes de ejecutar.
begin;
create table public.contest_domains (domain text primary key check (domain = lower(domain)));
insert into public.contest_domains values ('polymershapes.com');
alter table public.contest_domains enable row level security;
revoke all on public.contest_domains from anon, authenticated;

create function public.is_participant() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (select 1 from auth.users u join public.contest_domains d
      on d.domain = lower(split_part(u.email, '@', 2))
      where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function public.is_participant() from public, anon;
grant execute on function public.is_participant() to authenticated;

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  title text not null check (char_length(btrim(title)) between 1 and 90),
  author text not null check (char_length(btrim(author)) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
-- Evita duplicados ante reintentos después de perder la conexión.
create unique index entries_unique_submission on public.entries(user_id, title, author, md5(body));
create table public.votes (
  entry_id uuid not null references public.entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);
alter table public.entries enable row level security;
alter table public.votes enable row level security;
revoke all on public.entries, public.votes from anon, authenticated;
grant insert (title, author, body) on public.entries to authenticated;
create policy create_own_entry on public.entries for insert to authenticated
  with check (public.is_participant() and user_id = auth.uid());

create function public.list_entries()
returns table(id uuid, title text, author text, body text, created_at timestamptz, votes bigint, voted boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_participant() then raise insufficient_privilege using message = 'Corporate email required'; end if;
  return query select e.id, e.title, e.author, e.body, e.created_at,
    count(v.user_id), coalesce(bool_or(v.user_id = auth.uid()), false)
    from public.entries e left join public.votes v on v.entry_id = e.id
    group by e.id order by e.created_at desc, e.id;
end;
$$;
create function public.set_vote(entry_id uuid, desired boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_participant() then raise insufficient_privilege using message = 'Corporate email required'; end if;
  if desired is null then raise invalid_parameter_value using message = 'Vote state required'; end if;
  if desired then
    insert into public.votes(entry_id, user_id) values (set_vote.entry_id, auth.uid()) on conflict do nothing;
  else
    delete from public.votes v where v.entry_id = set_vote.entry_id and v.user_id = auth.uid();
  end if;
end;
$$;
revoke all on function public.list_entries(), public.set_vote(uuid, boolean) from public, anon;
grant execute on function public.list_entries(), public.set_vote(uuid, boolean) to authenticated;
commit;
