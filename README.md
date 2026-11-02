# Concurso público de Calaveritas · Polymershapes

Cualquiera puede leer, publicar y votar. No hay inicio de sesión, correo, contraseña, códigos ni registro. GitHub Pages aloja la página y Supabase guarda los datos compartidos entre visitantes.

## Actualizar una página existente

1. Reemplaza `index.html`, `styles.css`, `app.js` y los demás archivos por esta versión en **el repositorio de la cuenta que estás usando**. Conserva los valores reales de `config.js` si ya los configuraste.
2. En Supabase → **SQL Editor**, ejecuta el contenido de `supabase/schema.sql` actualizado. Funciona en proyectos nuevos y existentes y se puede repetir.
3. Si habías utilizado la versión anterior con correo y ya había publicaciones, ejecuta después `supabase/migrate-existing.sql` una vez (opcional). Copia las calaveritas y sus totales de votos sin borrar las tablas anteriores. Los votos importados se conservan en el total, pero no pueden retirarse desde la web porque estaban ligados a cuentas antiguas.
4. Espera a que termine el despliegue de GitHub Pages y recarga la página. Ya no debe aparecer ningún formulario de acceso.

## Si todavía no conectaste la base de datos

1. Crea un proyecto en https://supabase.com.
2. Abre **SQL Editor** y ejecuta `supabase/schema.sql` completo.
3. En la configuración API del proyecto, copia la **Project URL** y la **publishable key** (o la clave legacy `anon`) a `config.js`.
4. Guarda `config.js` en GitHub. Estos dos datos son públicos. Nunca uses claves `service_role`, secret keys ni contraseñas de base de datos en el navegador.

No hace falta configurar Authentication, correo ni SMTP. Sin una base de datos conectada puedes crear la vista previa, pero no compartir publicaciones ni guardar votos.

## Publicar en GitHub Pages

Sube los archivos descomprimidos a la raíz del repositorio; `index.html` debe quedar directamente allí. En **Settings → Pages**, selecciona **Deploy from a branch → main → /(root) → Save**. Comparte la URL que GitHub muestre en esa pantalla. Un repositorio público permite usar GitHub Pages gratis.

## Cómo funcionan los votos

El navegador crea un identificador aleatorio y lo guarda localmente; los votos se guardan en Supabase. Una clave única en la base de datos evita dos votos con el mismo identificador para la misma calaverita. Cada navegador puede votar o retirar su voto. No se recopilan correos.

El límite es por navegador, no por persona: otro navegador, modo privado o borrar los datos locales permite otro voto. Sin identificar a los participantes no se puede garantizar un voto por persona. Si el navegador bloquea el almacenamiento local, el identificador dura solo durante la visita.

La publicación es inmediata y pública. La organización puede moderar y borrar contenido en la tabla `public_entries` desde Supabase; sus votos se eliminan automáticamente. Los visitantes no pueden editar ni borrar publicaciones ni asignar directamente contadores de votos. No se han configurado fechas de cierre ni moderación previa.

## Desarrollo y comprobación

No requiere paquetes ni compilación. Usa el checkout existente, sin crear worktrees.

```sh
python3 -m http.server 8000
```

Comprueba con dos navegadores que ambos ven las publicaciones y el total actualizado al pulsar **Actualizar galería**. Prueba publicar, votar, retirar, recargar y publicar con la red desconectada (debe informar el fallo, no anunciar éxito). El texto se inserta como texto, nunca como HTML.

`assets/logo.svg` es un placeholder editable. Los estilos están en `styles.css`.

Para cerrar publicaciones y votos desde SQL Editor, conservando la lectura:

```sql
revoke insert on public.public_entries from anon, authenticated;
revoke execute on function public.set_public_vote(uuid,uuid,boolean) from anon, authenticated;
```
