"use strict";
const $ = id => document.getElementById(id);
const config = window.CONTEST_CONFIG || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl || "") && !!config.supabasePublishableKey && !config.supabasePublishableKey.includes("TU-");
let loading = false, messageTimer;
// Solo se filtra la presentación. No se modifican publicaciones ni votos en Supabase.
const normalizeTitle = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const finalistTitles = [
  "Ni la huesuda aguanto el turno",
  "LA CALACA LLEGÓ A POLYMERSHAPES ZAPOPAN"
].map(normalizeTitle);
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
  loading = true; $("refresh").disabled = true; $("gallery-status").textContent = "Cargando finalistas y votos acumulados…";
  try {
    const rows = await request("/rest/v1/rpc/list_public_entries", { method: "POST", body: { visitor_id: visitorId } });
    const finalists = rows.filter(entry => finalistTitles.includes(normalizeTitle(entry.title)))
      .sort((a, b) => finalistTitles.indexOf(normalizeTitle(a.title)) - finalistTitles.indexOf(normalizeTitle(b.title)));
    const nodes = finalists.map(entry => {
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
    $("entries").replaceChildren(...nodes); $("gallery-status").textContent = finalists.length === 2 ? "Dos finalistas · Votos acumulados conservados. Actualiza para consultar los resultados más recientes." : "No se pudieron encontrar las dos finalistas. Actualiza los votos o avisa a la organización.";
  } catch (error) { $("gallery-status").textContent = "No se pudo actualizar la galería. Los resultados anteriores pueden estar desactualizados."; notify(error.message); }
  finally { loading = false; $("refresh").disabled = false; }
}
$("refresh").onclick = load;
$("config-warning").hidden = configured;
if (configured) load();
else $("gallery-status").textContent = "La galería estará disponible cuando se conecte la base de datos.";
