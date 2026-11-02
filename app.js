"use strict";
const config = window.CONTEST_CONFIG || {};
const statusNode = document.getElementById("results-status");
const tableBody = document.getElementById("scores-body");
const refresh = document.getElementById("refresh");
const normalizeTitle = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const winnerTitle = normalizeTitle("LA CALACA LLEGÓ A POLYMERSHAPES ZAPOPAN");
let loading = false;
let hasResults = false;
function cell(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
// Solo lectura: no cambia participantes, votos ni la ganadora anunciada.
async function loadResults() {
  if (loading) return;
  loading = true;
  refresh.disabled = true;
  statusNode.textContent = "Consultando los puntajes de todos los participantes…";
  try {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl || "") || !config.supabasePublishableKey || config.supabasePublishableKey.includes("TU-")) {
      throw new Error("Falta configurar la conexión con Supabase.");
    }
    const response = await fetch(config.supabaseUrl + "/rest/v1/rpc/list_public_entries", {
      method: "POST",
      headers: {
        apikey: config.supabasePublishableKey,
        ...(config.supabasePublishableKey.startsWith("eyJ") ? { Authorization: "Bearer " + config.supabasePublishableKey } : {}),
        "Content-Type": "application/json"
      },
      body: "{}",
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error("No se pudieron consultar los puntajes de Supabase.");
    const entries = await response.json();
    if (!Array.isArray(entries) || entries.some(entry => typeof entry.title !== "string" || typeof entry.author !== "string" || !["number", "string"].includes(typeof entry.votes) || !/^\d+$/.test(String(entry.votes)) || !Number.isSafeInteger(Number(entry.votes)))) {
      throw new Error("La base de datos devolvió resultados que no se pudieron interpretar.");
    }
    entries.sort((a, b) => Number(b.votes) - Number(a.votes) || a.title.localeCompare(b.title, "es"));
    const rows = entries.map(entry => {
      const row = document.createElement("tr");
      const isWinner = normalizeTitle(entry.title) === winnerTitle;
      const author = cell("th", isWinner ? "Lydia" : entry.author);
      author.scope = "row";
      if (isWinner) {
        row.className = "winner-row";
        const badge = cell("span", "Ganadora");
        badge.className = "winner-chip";
        author.append(" ", badge);
      }
      row.append(author, cell("td", entry.title), cell("td", String(entry.votes)));
      return row;
    });
    if (!rows.length) {
      const row = document.createElement("tr");
      const empty = cell("td", "No hay participantes registrados en la base de datos.");
      empty.colSpan = 3;
      row.append(empty);
      rows.push(row);
    }
    tableBody.replaceChildren(...rows);
    hasResults = true;
    statusNode.textContent = `${entries.length} participantes · Puntajes consultados en Supabase, ordenados de mayor a menor.`;
  } catch (error) {
    statusNode.textContent = error.message + (hasResults ? " Los puntajes anteriores podrían estar desactualizados." : " Pulsa Actualizar puntajes para volver a intentarlo.");
    if (!hasResults) {
      const row = document.createElement("tr");
      const unavailable = cell("td", "Puntajes no disponibles. No se han sustituido por cifras de ejemplo.");
      unavailable.colSpan = 3;
      row.append(unavailable);
      tableBody.replaceChildren(row);
    }
  } finally {
    loading = false;
    refresh.disabled = false;
  }
}
refresh.addEventListener("click", loadResults);
loadResults();
