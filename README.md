# Calaveritas Literarias · Polymershapes

Página adaptable a móviles, sin compilación ni dependencias. GitHub Pages sirve la web; Supabase guarda las calaveritas y los votos compartidos. El acceso se verifica por código de correo. La base de datos restringe la participación al dominio corporativo configurado y admite un voto por cuenta y calaverita, con opción de retirarlo. Los correos no se muestran en la galería.

## 1. Crear la base de datos

1. Crea un proyecto en https://supabase.com y abre **SQL Editor**.
2. Abre `supabase/schema.sql`, cambia `polymershapes.com` por el dominio real de los correos de los participantes y ejecuta el archivo completo una sola vez en un proyecto nuevo. Puedes añadir varios dominios a `contest_domains` desde el panel; no añadas dominios personales si el concurso es interno.
3. En **Authentication → Providers → Email**, activa el acceso por correo y la confirmación de correo. Permite nuevos registros. No se usan usuarios anónimos.
4. En **Authentication → Email Templates → Magic Link**, configura el correo para mostrar el código: `<p>Tu código de acceso al concurso es: {{ .Token }}</p>`. Conserva el token tal como aparece, con llaves dobles. La página usa el código, no enlaces de redirección.
5. Configura un proveedor SMTP propio en Supabase para enviar a los empleados. El correo predeterminado de prueba tiene restricciones de destinatarios y envío; no basta para lanzar un concurso de empresa. Revisa los límites de envío/OTP y verifica los destinatarios permitidos antes del lanzamiento.
6. Copia la **Project URL** y la **publishable key** (o clave legacy `anon`) desde la configuración API del proyecto a `config.js`. Son datos públicos diseñados para estar en el navegador. **Nunca uses `service_role`, secret keys, contraseñas de base de datos ni claves de SMTP en estos archivos.**

La sesión se mantiene en memoria y hay que volver a acceder al recargar la página. Los votos y publicaciones permanecen guardados en Supabase. Al vencer la sesión, se solicita un código nuevo.

## 2. Subir a GitHub y activar Pages

Sube el contenido de esta carpeta a la raíz de tu repositorio. Si usas Git local:

```sh
git add index.html styles.css app.js config.js assets supabase README.md .gitignore .nojekyll
git commit -m "Agregar concurso de calaveritas con votos compartidos"
git push origin main
```

En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**. Espera a que termine el despliegue y comparte la URL que GitHub muestra. La disponibilidad de Pages para repositorios privados depende de tu plan. La web puede ser accesible públicamente; las calaveritas y votos requieren un correo corporativo autorizado por el servidor.

## 3. Probar antes de compartir

```sh
python3 -m http.server 8000
```

Abre el servidor local en tu navegador. Sin datos en `config.js`, funciona el creador y su vista previa; guardar y consultar requieren Supabase.

- Accede con una cuenta corporativa real, publica una calaverita y vota.
- Abre otro navegador con otra cuenta: debe ver la publicación y el voto; al votar, el contador debe aumentar.
- Recarga y vuelve a acceder: los datos deben permanecer.
- Intenta repetir el voto con la misma cuenta: solo debe existir un registro. Retirarlo solo elimina el voto propio.
- Comprueba que una cuenta de otro dominio no puede leer, publicar ni votar, incluso invocando directamente la API con su sesión.
- Desconecta la red y comprueba que se informa del fallo sin anunciar un guardado exitoso.

Las comprobaciones reales de correo y persistencia requieren configurar y ejecutar el proyecto Supabase. No se incluyen datos simulados en la galería ni se sustituyen guardados fallidos por almacenamiento local.

## Diseño y administración

`assets/logo.svg` es un placeholder editable; sustitúyelo por el logo oficial autorizado. Colores y estilos están en `styles.css`. La muestra de vista previa no se publica automáticamente. No se permiten ediciones ni borrados desde el navegador; la organización puede moderar desde el panel de Supabase. Borrar una calaverita elimina sus votos asociados.

El límite es por cuenta de correo corporativo, no por dispositivo; alias y múltiples cuentas son responsabilidad del organizador. No hay fechas de apertura/cierre ni moderación previa configuradas. Para cerrar el concurso, revoca en el SQL Editor las operaciones de escritura, manteniendo la lectura:

```sql
revoke insert on public.entries from authenticated;
revoke execute on function public.set_vote(uuid, boolean) from authenticated;
```

Para reabrir:

```sql
grant insert (title, author, body) on public.entries to authenticated;
grant execute on function public.set_vote(uuid, boolean) to authenticated;
```

No se necesita instalar paquetes para desarrollar. Usa el checkout existente; no crees un worktree para iniciar esta web.

## Validación realizada

- Sintaxis de JavaScript comprobada con Node.
- Chromium: vista previa, inserción segura de texto, acceso por código, publicación, voto, retiro y cierre de sesión con API simulada; sin desbordamiento horizontal a 375, 768 y 1440 px.
- Esquema ejecutado en PostgreSQL embebido (PGlite) con funciones de identidad simuladas: publicación, voto idempotente, retiro propio y bloqueo a visitantes y dominios externos.
- Pendiente: integración con un proyecto Supabase real, envío SMTP y despliegue en GitHub Pages. Las pruebas simuladas no confirman estos servicios externos.
