-- Ejecutar una vez en Supabase > SQL Editor para cerrar las escrituras también
-- en páginas antiguas y llamadas directas a la API. NO borra ni reinicia votos.
begin;
revoke insert on public.public_entries from anon, authenticated;
revoke execute on function public.set_public_vote(uuid,uuid,boolean) from public, anon, authenticated;
commit;
