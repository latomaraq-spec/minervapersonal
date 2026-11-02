"use strict";
const $ = id => document.getElementById(id);
const config = window.CONTEST_CONFIG || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl || "") && !!config.supabasePublishableKey && !config.supabasePublishableKey.includes("TU-");
let draft = null, loading = false, publishing = false, messageTimer;
let visitorId;
try {
  visitorId = localStorage.getItem("calaveritas-visitor");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId || "")) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("calaveritas-visitor", visitorId);
  }
} catch { visitorId = crypto.randomUUID(); }

function notify(text) { $("message").textContent = text; clearTimeout(messageTimer); messageTimer = setTimeout(() => $("message").textContent = "", 8000); }
function el(tag, cls, text) { const node = document.createElement(tag); node.className = cls || ""; if (text !== undefined) node.textContent = text; return node; }
function paper(data) {
  const node = el("article", "paper");
  const ornament = el("div", "ornament", "✿ ✦ ✿"); ornament.setAttribute("aria-hidden", "true");
  node.append(ornament, el("h3", "", data.title), el("div", "poem", data.body), el("p", "author", "— " + data.author + " —"), el("div", "paper-footer", "POLYMERSHAPES · DÍA DE MUERTOS")); return node;
}
async function request(path, { method = "GET", body } = {}) {
  if (!configured) throw new Error("Configura Supabase en config.js antes de conectar el concurso.");
  const response = await fetch(config.supabaseUrl + path, { method, headers: {
    apikey: config.supabasePublishableKey,
    ...(config.supabasePublishableKey.startsWith("eyJ") ? { Authorization: "Bearer " + config.supabasePublishableKey } : {}),
    "Content-Type": "application/json"
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 429) throw new Error("Demasiadas solicitudes. Espera un momento antes de intentarlo otra vez.");
    if (data?.code === "42501") throw new Error("La base de datos no permite la operación. La organización debe aplicar el esquema público actualizado.");
    if (data?.code === "23505") throw new Error("Ya registraste esta publicación o voto. Actualiza la galería.");
    throw new Error("No se pudo guardar o cargar la información. Revisa la conexión y la configuración del concurso.");
  }
  return data;
}
async function load() {
  if (loading) return;
  loading = true; $("refresh").disabled = true; $("gallery-status").textContent = "Cargando calaveritas…";
  try {
    const rows = await request("/rest/v1/rpc/list_public_entries", { method: "POST", body: { visitor_id: visitorId } });
    const nodes = rows.map(entry => {
      const wrapper = el("div", "entry"), row = el("div", "vote-row");
      const button = el("button", "btn outline", entry.voted ? "♥ Retirar mi voto" : "♡ Votar por esta calaverita");
      button.type = "button"; button.setAttribute("aria-pressed", String(entry.voted)); button.setAttribute("aria-label", `${entry.voted ? 'Retirar mi voto de' : 'Votar por'} ${entry.title}`);
      button.onclick = async () => {
        button.disabled = true;
        try { await request("/rest/v1/rpc/set_public_vote", { method: "POST", body: { entry_id: entry.id, visitor_id: visitorId, desired: !entry.voted } }); await load(); }
        catch (error) { notify(error.message); } finally { button.disabled = false; }
      };
      row.append(button, el("span", "", `${entry.votes} ${Number(entry.votes) === 1 ? "voto" : "votos"}`)); wrapper.append(paper(entry), row); return wrapper;
    });
    $("entries").replaceChildren(...nodes); $("gallery-status").textContent = rows.length ? `${rows.length} calaveritas · Actualiza para consultar los votos más recientes.` : "Todavía no hay calaveritas. ¡Publica la primera!";
  } catch (error) { $("gallery-status").textContent = "No se pudo actualizar la galería. Los resultados anteriores pueden estar desactualizados."; notify(error.message); }
  finally { loading = false; $("refresh").disabled = false; }
}
$("refresh").onclick = load;
$("creator").addEventListener("input", () => { draft = null; $("publish").disabled = true; $("chars").textContent = `${$("body").value.length} / 4000`; $("preview-note").textContent = "Genera una nueva vista previa para publicar tus cambios."; });
$("creator").addEventListener("submit", event => {
  event.preventDefault(); draft = { id: crypto.randomUUID(), title: $("title").value.trim(), author: $("author").value.trim(), body: $("body").value.trim() };
  if (Object.values(draft).some(value => !value)) { draft = null; notify("Completa todos los campos; no pueden contener solo espacios."); return; }
  $("preview").replaceChildren(paper(draft)); $("publish").disabled = publishing || !configured;
  $("preview-note").textContent = configured ? "Tu calaverita está lista para compartir." : "La organización debe conectar la galería para publicar.";
});
$("publish").onclick = async () => {
  if (!draft || publishing) return;
  publishing = true; $("publish").disabled = true; const submitted = draft;
  try {
    await request("/rest/v1/public_entries", { method: "POST", body: submitted });
    if (draft === submitted) { draft = null; $("creator").reset(); $("chars").textContent = "0 / 4000"; $("preview-note").textContent = "¡Publicada! Gracias por compartir tus versos."; }
    notify("¡Calaverita guardada en el concurso!"); await load();
  } catch (error) { notify(error.message); } finally { publishing = false; $("publish").disabled = !draft || !configured; }
};
$("config-warning").hidden = configured;
$("preview").append(paper({ title: "La flaca pidió cotización", author: "Tu nombre aquí", body: "Llegó la flaca temprano,\ncon su lista y su cartón:\n«Busco ingenio, busco ganas,\ny una buena solución».\n\nEntre láminas y risas\nsu guadaña se olvidó;\npues con tanto gran talento,\n¡hasta un verso se llevó!" }));
if (configured) load();
else $("gallery-status").textContent = "La galería estará disponible cuando se conecte la base de datos.";
