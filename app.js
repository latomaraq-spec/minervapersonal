"use strict";
const $ = id => document.getElementById(id);
const config = window.CONTEST_CONFIG || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl || "") && !!config.supabasePublishableKey && !config.supabasePublishableKey.includes("TU-");
let session = null, draft = null, email = "", loading = false, publishing = false, messageTimer;
function notify(text) { $("message").textContent = text; clearTimeout(messageTimer); messageTimer = setTimeout(() => $("message").textContent = "", 8000); }
function el(tag, cls, text) { const node = document.createElement(tag); node.className = cls || ""; if (text !== undefined) node.textContent = text; return node; }
function paper(data) {
  const node = el("article", "paper");
  const ornament = el("div", "ornament", "✿ ✦ ✿"); ornament.setAttribute("aria-hidden", "true");
  node.append(ornament, el("h3", "", data.title), el("div", "poem", data.body), el("p", "author", "— " + data.author + " —"), el("div", "paper-footer", "POLYMERSHAPES · DÍA DE MUERTOS")); return node;
}
async function request(path, { method = "GET", body, auth = true } = {}) {
  if (!configured) throw new Error("Configura Supabase en config.js antes de conectar el concurso.");
  if (auth && !session) throw new Error("Accede con tu correo corporativo para continuar.");
  const response = await fetch(config.supabaseUrl + path, { method, headers: {
    apikey: config.supabasePublishableKey,
    ...(auth ? { Authorization: "Bearer " + session.access_token } : {}),
    "Content-Type": "application/json"
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (auth && response.status === 401) { session = null; updateAuth(); throw new Error("Tu sesión venció. Solicita un nuevo código de acceso."); }
    if (response.status === 429) throw new Error("Demasiadas solicitudes. Espera un momento antes de intentarlo otra vez.");
    if (data?.code === "42501") throw new Error("Tu correo no está autorizado. Consulta con quien organiza el concurso.");
    if (data?.code === "23505") throw new Error("Ya registraste esta publicación o voto. Actualiza la galería.");
    throw new Error(auth ? "No se pudo guardar o cargar la información. Revisa la conexión y la configuración del concurso." : "No se pudo validar el acceso. Revisa el correo, el código o la configuración de Supabase.");
  }
  return data;
}
function updateAuth() {
  $("login").hidden = !!session; $("verify").hidden = true; $("account").hidden = !session;
  $("account-email").textContent = session?.user?.email || "";
  $("publish").disabled = !draft || !session || publishing;
  $("refresh").disabled = !session || loading;
  if (!session) { $("entries").replaceChildren(); $("gallery-status").textContent = "Accede para descubrir las calaveritas del equipo."; }
}
$("login").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  email = $("email").value.trim().toLowerCase();
  try { await request("/auth/v1/otp", { method: "POST", auth: false, body: { email, create_user: true } }); $("login").hidden = true; $("verify").hidden = false; $("code").focus(); notify("Revisa tu correo e introduce el código recibido."); }
  catch (error) { notify(error.message); } finally { button.disabled = false; }
});
$("change-email").onclick = () => { $("verify").hidden = true; $("login").hidden = false; $("code").value = ""; };
$("verify").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try { session = await request("/auth/v1/verify", { method: "POST", auth: false, body: { email, token: $("code").value.trim(), type: "email" } }); $("code").value = ""; updateAuth(); await load(); }
  catch (error) { notify(error.message); } finally { button.disabled = false; }
});
$("logout").onclick = async () => {
  try { await request("/auth/v1/logout", { method: "POST" }); }
  catch { notify("La sesión local se cerró. No se pudo confirmar el cierre remoto; el token expirará automáticamente."); }
  finally { session = null; updateAuth(); }
};
async function load() {
  if (loading || !session) return;
  loading = true; $("refresh").disabled = true; $("gallery-status").textContent = "Cargando calaveritas…";
  try {
    const currentSession = session;
    const rows = await request("/rest/v1/rpc/list_entries", { method: "POST", body: {} });
    if (session !== currentSession) return;
    const nodes = rows.map(entry => {
      const wrapper = el("div", "entry"), row = el("div", "vote-row");
      const button = el("button", "btn outline", entry.voted ? "♥ Retirar mi voto" : "♡ Votar por esta calaverita");
      button.type = "button"; button.setAttribute("aria-pressed", String(entry.voted)); button.setAttribute("aria-label", `${entry.voted ? 'Retirar mi voto de' : 'Votar por'} ${entry.title}`);
      button.onclick = async () => {
        button.disabled = true;
        try { await request("/rest/v1/rpc/set_vote", { method: "POST", body: { entry_id: entry.id, desired: !entry.voted } }); await load(); }
        catch (error) { notify(error.message); } finally { button.disabled = false; }
      };
      row.append(button, el("span", "", `${entry.votes} ${Number(entry.votes) === 1 ? "voto" : "votos"}`)); wrapper.append(paper(entry), row); return wrapper;
    });
    $("entries").replaceChildren(...nodes); $("gallery-status").textContent = rows.length ? `${rows.length} calaveritas · Actualiza para consultar los votos más recientes.` : "Todavía no hay calaveritas. ¡Publica la primera!";
  } catch (error) { $("gallery-status").textContent = "No se pudo actualizar la galería. Los resultados anteriores pueden estar desactualizados."; notify(error.message); }
  finally { loading = false; $("refresh").disabled = !session; }
}
$("refresh").onclick = load;
$("creator").addEventListener("input", () => { draft = null; $("publish").disabled = true; $("chars").textContent = `${$("body").value.length} / 4000`; $("preview-note").textContent = "Genera una nueva vista previa para publicar tus cambios."; });
$("creator").addEventListener("submit", event => {
  event.preventDefault(); draft = { title: $("title").value.trim(), author: $("author").value.trim(), body: $("body").value.trim() };
  if (Object.values(draft).some(value => !value)) { draft = null; notify("Completa todos los campos; no pueden contener solo espacios."); return; }
  $("preview").replaceChildren(paper(draft)); $("publish").disabled = !session || publishing;
  $("preview-note").textContent = session ? "Tu calaverita está lista para compartir." : "Accede con tu correo para publicar tu calaverita.";
});
$("publish").onclick = async () => {
  if (!draft || publishing) return;
  publishing = true; $("publish").disabled = true; const submitted = draft;
  try {
    await request("/rest/v1/entries", { method: "POST", body: submitted });
    if (draft === submitted) { draft = null; $("creator").reset(); $("chars").textContent = "0 / 4000"; $("preview-note").textContent = "¡Publicada! Gracias por compartir tus versos."; }
    notify("¡Calaverita guardada en el concurso!"); await load();
  } catch (error) { notify(error.message); } finally { publishing = false; $("publish").disabled = !draft || !session; }
};
$("config-warning").hidden = configured;
$("preview").append(paper({ title: "La flaca pidió cotización", author: "Tu nombre aquí", body: "Llegó la flaca temprano,\ncon su lista y su cartón:\n«Busco ingenio, busco ganas,\ny una buena solución».\n\nEntre láminas y risas\nsu guadaña se olvidó;\npues con tanto gran talento,\n¡hasta un verso se llevó!" }));
updateAuth();
