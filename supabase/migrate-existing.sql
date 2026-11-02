-- OPCIONAL: solo si ejecutaste la versión anterior con correo y ya tiene datos.
-- Ejecuta PRIMERO schema.sql actualizado. Conserva los originales y sus votos.
-- Se puede repetir: no duplica publicaciones ni acumula votos de nuevo.
begin;
insert into public.public_entries(id,title,author,body,created_at,initial_votes)
select e.id,e.title,e.author,e.body,e.created_at,count(v.user_id)
from public.entries e left join public.votes v on v.entry_id=e.id
 group by e.id
on conflict(id) do nothing;
commit;
