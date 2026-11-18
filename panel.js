// Panel de stock y caja (lógica). Se monta con window.mountPanel y guarda con saveState().
const PANEL_HTML = `
<div class="savebar" id="savebar" role="status" aria-live="polite"></div>
<div class="panel">
  <section id="view-stock" class="stack" aria-label="Stock">
    <div class="stats" id="stats-stock"></div>
    <div class="loadcard">
      <div class="loadtext">
        <b>¿Tenés el stock anotado?</b>
        <span>Pegá la lista tal como la anotás, con el nombre y la cantidad de rollos, por ejemplo "Morley est 494". Los kilos totales los cargás después en la tabla.</span>
      </div>
      <button id="btn-paste" class="primary big">Pegar lista de stock</button>
    </div>
    <div class="bar">
      <input id="q" class="grow" type="search" placeholder="Buscar tela" aria-label="Buscar tela">
      <button id="btn-add">+ Nueva tela</button>
      <button id="btn-import">Subir Excel</button>
      <button id="btn-export">Descargar Excel</button>
      <button id="btn-backup">Guardar todo (copia + Excel)</button>
      <button id="btn-restore">Restaurar copia</button>
      <input id="file" type="file" accept=".xlsx,.xls,.csv" hidden>
      <input id="file-restore" type="file" accept=".json" hidden>
    </div>
    <p class="hint" id="backup-note"></p>
    <p class="hint">Tocá cualquier número para cambiarlo. Los <b>kilos totales</b> son la suma de todos los rollos de esa tela. El precio de lista es solo de referencia: en cada venta ponés el precio de ese cliente. Todo se guarda solo en el servidor.</p>
    <div class="tablebox">
      <table>
        <thead><tr><th>Tela</th><th class="num">Rollos</th><th class="num">Kilos totales</th><th class="num">Precio de lista (opcional)</th><th class="num">Mínimo (kg)</th><th class="num">Valor</th><th></th></tr></thead>
        <tbody id="tb-stock"></tbody>
      </table>
    </div>
  </section>

  <section id="view-caja" class="stack" aria-label="Caja">
    <form class="card" id="sale-form" autocomplete="off">
      <h2 class="title">Caja · Nueva venta</h2>
      <label for="s-item">Tela<select id="s-item"></select></label>
      <div class="row2">
        <label for="s-rolls">Rollos (opcional)<input id="s-rolls" type="number" min="0" step="1" inputmode="numeric" placeholder="0"></label>
        <label for="s-qty">Kilos<input id="s-qty" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
        
      </div>
      <label for="s-price">Precio de esta venta (por kilo)<input id="s-price" type="number" min="0" step="any" inputmode="decimal" placeholder="Escribilo para cada cliente"></label>
      <p class="hint" id="s-ref"></p>
      <div class="row2">
        <label id="s-method-wrap" for="s-method">Forma de pago
          <select id="s-method"><option>Efectivo</option><option>Transferencia</option><option>Débito</option><option>Crédito</option><option value="Deuda">Queda debiendo (fiado)</option></select>
        </label>
        <label for="s-note">Cliente o nota<input id="s-note" type="text" placeholder="Si queda debiendo, el nombre"></label>
      </div>
      <button type="button" class="linkbtn" id="s-split">Dividir el pago (por ej. efectivo + transferencia)</button>
      <div id="s-split-box" class="splitbox" hidden>
        <label for="sp-ef">Efectivo<input id="sp-ef" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
        <label for="sp-tr">Transferencia<input id="sp-tr" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
        <label for="sp-de">Débito<input id="sp-de" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
        <label for="sp-cr">Crédito<input id="sp-cr" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
        <label for="sp-deu">Queda debiendo<input id="sp-deu" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
        <div class="splitresto" id="sp-resto"></div>
      </div>
      <div class="total"><span class="hint">Total</span><b id="s-total">$ 0</b></div>
      <p class="msg" id="s-msg" role="alert"></p>
      <button class="primary big" id="s-submit" type="submit">Cobrar y descontar stock</button>
    </form>

    <div class="bar"><label for="day" style="grid-auto-flow:column;align-items:center;gap:10px">Día<input id="day" type="date"></label></div>
    <div class="methods" id="stats-caja"></div>
    <div class="card" id="cierre"><h2 class="title">Cierre de caja</h2><div id="cierre-body" class="stack"></div></div>
    <div class="card" id="deudores"><h2 class="title" id="deudores-title">Deudores</h2><div id="deudores-body" class="stack"></div></div>
    <div class="tablebox">
      <table style="min-width:0">
        <tbody id="tb-sales" class="sale"></tbody>
      </table>
    </div>
  </section>
</div>

<dialog id="dlg-paste">
  <form method="dialog" id="f-paste">
    <h2>Pegar lista de stock</h2>
    <p class="hint">Una tela por línea: el nombre, la cantidad de <b>rollos</b> y, si querés, los <b>kilos totales</b>. Por ejemplo "Morley est 494" o "Wafle 615 1250". Las telas que ya existen se actualizan y las nuevas se agregan.</p>
    <textarea id="paste-text" placeholder="Morley est 494&#10;Wafle 615 1250&#10;Lino liso 2.510"></textarea>
    <div class="dlgbtns"><button type="button" class="ghost" id="paste-cancel">Cancelar</button><button type="submit" class="primary">Cargar</button></div>
  </form>
</dialog>

<dialog id="dlg-in">
  <form method="dialog" id="f-in">
    <h2 id="in-title">Entró mercadería</h2>
    <label for="in-rolls">Rollos que entran<input id="in-rolls" type="number" min="0" step="1" inputmode="numeric"></label>
    <label for="in-qty">Kilos que entran<input id="in-qty" type="number" min="0" step="any" inputmode="decimal"></label>
    <label for="in-note">Nota<input id="in-note" type="text" placeholder="Proveedor, remito (opcional)"></label>
    <div class="dlgbtns"><button type="button" class="ghost" id="in-cancel">Cancelar</button><button type="submit" class="primary">Sumar al stock</button></div>
  </form>
</dialog>
<div id="toast" role="status" aria-live="polite"></div>
`;

// Lógica del panel de stock y caja. Se monta sobre el HTML de helpers/panelHtml
// y guarda todo en el servidor (endpoints/state) con control de versión.

const SEED = [
  ["Morley est", 494], ["Wafle", 615], ["Morley liso", 540], ["Modal est", 470], ["Cey", 553],
  ["Wafle est", 626], ["Lino liso", 2510], ["Scuba glitter", 582], ["Lino est", 126], ["Hawái", 565],
  ["Cey puffing", 620], ["Wafle con flush", 132], ["Lycra est", 276], ["Plush simple", 80],
  ["Timberland", 176], ["Darlon rib", 86],
];

window.mountPanel = function mountPanel(root, { initialData, initialVersion, onConflict, saveState, readOnly }) {
  root.innerHTML = PANEL_HTML;
  var disposed = false;
  var uid = function () { return Math.random().toString(36).slice(2, 10); };

  var state = initialData && initialData.items ? initialData : {
    items: readOnly ? [] : SEED.map(function (r) { return { id: uid(), name: r[0], unit: "kg", rolls: r[1], stock: 0, price: 0, min: 0 }; }),
    sales: [], moves: [], cash: {}, expenses: [],
  };
  var fin = function (v) { v = +v; return isFinite(v) ? v : 0; };
  state.items = (Array.isArray(state.items) ? state.items : []).filter(function (i) { return i && typeof i === "object" && typeof i.name === "string"; }).map(function (i) {
    return { id: String(i.id || uid()), name: i.name, unit: "kg", rolls: fin(i.rolls), stock: fin(i.stock), price: fin(i.price), min: fin(i.min) };
  });
  state.sales = (Array.isArray(state.sales) ? state.sales : []).filter(function (s) { return s && typeof s === "object"; });
  state.moves = Array.isArray(state.moves) ? state.moves : [];
  state.expenses = Array.isArray(state.expenses) ? state.expenses : [];
  state.collections = (Array.isArray(state.collections) ? state.collections : []).filter(function (c) { return c && typeof c === "object" && typeof c.client === "string"; });
  state.cash = state.cash && typeof state.cash === "object" ? state.cash : {};
  var version = initialVersion || 0;

  var $ = function (s) { return root.querySelector(s); };
  var nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
  var mf0 = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  var mf2 = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fmt = function (n) { return nf.format(n || 0); };
  var money = function (n) { var v = n || 0; return Number.isInteger(v) ? mf0.format(v) : mf2.format(v); };
  var ACC = new RegExp("[" + String.fromCharCode(768) + "-" + String.fromCharCode(879) + "]", "g");
  var norm = function (s) { return String(s).normalize("NFD").replace(ACC, "").toLowerCase().replace(/\s+/g, " ").trim(); };
  var dayKey = function (ts) { var d = new Date(ts); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
  var hhmm = function (ts) { return new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }); };
  function r2(n) { return Math.round(n * 100) / 100; }

  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === "class") el.className = attrs[k]; else if (k === "text") el.textContent = attrs[k]; else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]); else el.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return el;
  }
  var toastTimer;
  function toast(t) { var el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("show"); }, 3200); }

  /* ---------- guardado en el servidor ---------- */
  var dirty = false, saving = false, conflict = false, saveTimer = null, okMsg = "", retryTimer = null;
  function setStatus(text, cls) { var el = $("#savebar"); if (!el) return; el.textContent = text; el.className = "savebar " + (cls || ""); }
  function save(msg) {
    if (conflict || readOnly) return;
    dirty = true; if (msg) okMsg = msg;
    setStatus("Guardando…", "");
    clearTimeout(saveTimer); saveTimer = setTimeout(flush, msg ? 0 : 350);
  }
  async function flush() {
    if (saving || !dirty || conflict || disposed) return;
    clearTimeout(retryTimer); retryTimer = null;
    saving = true; dirty = false;
    var snapshot = JSON.parse(JSON.stringify(state)), msg = okMsg; okMsg = "";
    try {
      version = await saveState(snapshot, version);
      if (dirty) { setStatus("Guardando…", ""); } else { setStatus("Todo guardado en el servidor", "ok"); }
      if (msg) toast(msg);
    } catch (e) {
      if (e && e.code === "CONFLICT") {
        conflict = true; setStatus("Otra persona cambió los datos. Actualizando…", "bad"); toast("Otra persona cambió los datos. Se actualiza la pantalla.");
        setTimeout(function () { if (!disposed) onConflict(); }, 2500);
        saving = false; return;
      }
      dirty = true; if (msg) okMsg = msg;
      if (e && e.code === "SESSION") setStatus("⚠ NO SE GUARDÓ: tu sesión venció. Tocá Salir, volvé a ingresar y cargá de nuevo lo último.", "bad");
      else setStatus("⚠ NO SE GUARDÓ. Revisá la conexión, reintento solo.", "bad");
      clearTimeout(retryTimer); retryTimer = setTimeout(flush, 4000);
    } finally {
      saving = false;
      if (dirty && !conflict && !retryTimer) flush();
    }
  }
  function beforeUnload(ev) { if (dirty || saving) { ev.preventDefault(); ev.returnValue = ""; } }
  window.addEventListener("beforeunload", beforeUnload);
  if (initialVersion === 0 && !readOnly) save();
  else setStatus("Todo guardado en el servidor", "ok");

  function itemById(id) { return state.items.filter(function (i) { return i.id === id; })[0]; }
  function logMove(item, type, qty, note, rolls) { state.moves.push({ id: uid(), ts: Date.now(), itemId: item.id, name: item.name, type: type, qty: qty, rolls: rolls || 0, stockAfter: item.stock, rollsAfter: item.rolls || 0, note: note || "" }); }

  /* ---------- stock ---------- */
  function isLow(i) { return i.min > 0 && i.stock < i.min; }
  function renderStats() {
    var total = 0, value = 0, low = 0, rollsTotal = 0;
    state.items.forEach(function (i) { total += i.stock; rollsTotal += i.rolls || 0; value += i.stock * i.price; if (isLow(i)) low++; });
    var box = $("#stats-stock"); box.textContent = "";
    [["Telas", String(state.items.length), ""], ["Rollos", fmt(rollsTotal), ""], ["Kilos totales", fmt(total), ""], ["Valor a precio de lista", money(value), ""],
     ["Para reponer", String(low), low ? "warn" : ""]].forEach(function (s) {
      box.appendChild(h("div", { class: "stat " + s[2] }, h("small", { text: s[0] }), h("b", { text: s[1] })));
    });
  }
  function paintRow(tr, i) {
    tr.classList.toggle("low", isLow(i));
    var v = tr.querySelector(".val"); v.textContent = i.price && i.stock ? money(i.stock * i.price) : "–";
  }
  function numInput(item, field) {
    var inp = h("input", { class: "n", type: "number", step: "any", min: "0", inputmode: "decimal", value: String(item[field]), "aria-label": field + " de " + item.name });
    inp.addEventListener("change", function () {
      var v = Math.max(0, num(inp.value)); if (field === "rolls") v = Math.round(v); var old = item[field]; item[field] = v; inp.value = String(v);
      if (field === "stock" && v !== old) logMove(item, "ajuste", v - old, "Edición manual", 0);
      if (field === "rolls" && v !== old) logMove(item, "ajuste", 0, "Edición manual", v - old);
      save(); paintRow(inp.closest("tr"), item); renderStats(); fillSelect();
    });
    return inp;
  }
  function renderStock() {
    var q = norm($("#q").value), tb = $("#tb-stock"); tb.textContent = "";
    var list = state.items.filter(function (i) { return !q || norm(i.name).indexOf(q) >= 0; });
    if (!list.length) { tb.appendChild(h("tr", null, h("td", { colspan: "7", class: "empty", text: state.items.length ? "Ninguna tela coincide con la búsqueda." : "Todavía no hay telas. Tocá + Nueva tela o Pegar lista." }))); }
    list.forEach(function (i) {
      var name = h("input", { type: "text", value: i.name, "aria-label": "Nombre de la tela" });
      name.addEventListener("change", function () { i.name = name.value.trim() || i.name; name.value = i.name; save(); fillSelect(); });
      var tr = h("tr", null,
        h("td", null, name), h("td", { class: "num rollscell" }, numInput(i, "rolls")),
        h("td", { class: "num stockcell" }, numInput(i, "stock")),
        h("td", { class: "num pricecell" }, numInput(i, "price")),
        h("td", { class: "num" }, numInput(i, "min")),
        h("td", { class: "num val" }),
        h("td", { class: "actions" },
          h("button", { class: "sm", text: "+ Entró", onclick: function () { openIngreso(i); } }), " ",
          h("button", { class: "sm danger ghost", text: "Borrar", onclick: function (ev) { delItem(i, ev.currentTarget); } })));
      paintRow(tr, i); tb.appendChild(tr);
    });
    renderStats(); fillSelect(); renderCaja();
  }
  var armed = null;
  function delItem(i, btn) {
    if (armed !== btn) { if (armed) { armed.textContent = "Borrar"; } armed = btn; btn.textContent = "¿Seguro?"; setTimeout(function () { if (armed === btn) { btn.textContent = "Borrar"; armed = null; } }, 3000); return; }
    state.items = state.items.filter(function (x) { return x.id !== i.id; }); armed = null; save("Tela borrada"); renderStock();
  }
  $("#q").addEventListener("input", renderStock);
  $("#btn-add").addEventListener("click", function () {
    var it = { id: uid(), name: "Nueva tela", unit: "kg", rolls: 0, stock: 0, price: 0, min: 0 };
    state.items.unshift(it); $("#q").value = ""; save(); renderStock();
    var first = $("#tb-stock input"); if (first) { first.focus(); first.select(); }
  });

  /* ingreso */
  var ingresoItem = null;
  function openIngreso(i) { ingresoItem = i; $("#in-title").textContent = "Entró: " + i.name; $("#in-qty").value = ""; $("#in-rolls").value = ""; $("#in-note").value = ""; $("#dlg-in").showModal(); $("#in-qty").focus(); }
  $("#in-cancel").addEventListener("click", function () { $("#dlg-in").close(); });
  $("#f-in").addEventListener("submit", function () {
    var q = num($("#in-qty").value), rl = Math.round(num($("#in-rolls").value));
    if (!ingresoItem || (q <= 0 && rl <= 0)) return;
    ingresoItem.stock = Math.round((ingresoItem.stock + Math.max(q, 0)) * 1000) / 1000;
    ingresoItem.rolls = (ingresoItem.rolls || 0) + Math.max(rl, 0);
    logMove(ingresoItem, "ingreso", Math.max(q, 0), $("#in-note").value, Math.max(rl, 0));
    save("Sumaste " + (rl > 0 ? rl + " rollos " : "") + (q > 0 ? fmt(q) + " kg " : "") + "a " + ingresoItem.name); renderStock();
  });

  /* pegar lista */
  function parseNumber(s) { s = String(s).replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."); return parseFloat(s); }
  function applyList(rows) {
    var upd = 0, add = 0;
    rows.forEach(function (r) {
      var found = state.items.filter(function (i) { return norm(i.name) === norm(r.name); })[0];
      if (found) {
        var oldKg = found.stock, oldRolls = found.rolls || 0;
        if (r.rolls != null) found.rolls = r.rolls;
        if (r.kg != null) found.stock = r.kg;
        if (r.price != null) found.price = r.price;
        if (r.min != null) found.min = r.min;
        var dk = found.stock - oldKg, dr = (found.rolls || 0) - oldRolls;
        if (dk !== 0 || dr !== 0) logMove(found, "ajuste", dk, "Carga de lista", dr);
        upd++;
      } else {
        var it = { id: uid(), name: r.name, unit: "kg", rolls: r.rolls || 0, stock: r.kg || 0, price: r.price || 0, min: r.min != null ? r.min : 0 };
        state.items.push(it); logMove(it, "alta", it.stock, "Carga de lista", it.rolls); add++;
      }
    });
    save(upd + " actualizadas, " + add + " nuevas"); renderStock();
  }
  $("#btn-paste").addEventListener("click", function () { $("#dlg-paste").showModal(); $("#paste-text").focus(); });
  $("#paste-cancel").addEventListener("click", function () { $("#dlg-paste").close(); });
  $("#f-paste").addEventListener("submit", function () {
    var rows = [];
    $("#paste-text").value.split(/\r?\n/).forEach(function (line) {
      var m = line.trim().match(/^(?:stock\s+)?(.+?)[\s:=-]+([\d.,]+)(?:\s+([\d.,]+))?\s*$/i);
      if (!m || !/[a-zA-ZÀ-ÿ]/.test(m[1])) return;
      var rl = parseNumber(m[2]), kg = m[3] != null ? parseNumber(m[3]) : null;
      if (!isFinite(rl) || (kg != null && !isFinite(kg))) return;
      rows.push({ name: m[1].trim().replace(/^./, function (c) { return c.toUpperCase(); }), rolls: Math.round(rl), kg: kg });
    });
    if (rows.length) applyList(rows); else toast("No encontré líneas con nombre y número");
    $("#paste-text").value = "";
  });

  /* importar Excel */
  $("#btn-import").addEventListener("click", function () { $("#file").click(); });
  $("#file").addEventListener("change", function () {
    var f = this.files[0]; if (!f) return; var inp = this;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var wb = XLSX.read(rd.result, { type: "array" });
        var ws = wb.Sheets["Stock"] || wb.Sheets[wb.SheetNames[0]];
        var data = XLSX.utils.sheet_to_json(ws, { defval: "" }), rows = [];
        data.forEach(function (r) {
          var low = {}; Object.keys(r).forEach(function (k) { low[norm(k)] = r[k]; });
          var name = low["tela"] || low["nombre"] || low["producto"];
          var rl = low["rollos"] != null ? low["rollos"] : low["piezas"];
          var kg = low["kilos totales"] != null ? low["kilos totales"] : (low["kilos"] != null ? low["kilos"] : (low["stock"] != null ? low["stock"] : low["cantidad"]));
          if (!name) return;
          var hasRl = rl != null && rl !== "" && isFinite(parseNumber(rl)), hasKg = kg != null && kg !== "" && isFinite(parseNumber(kg));
          if (!hasRl && !hasKg) return;
          var price = low["precio de lista"] != null ? low["precio de lista"] : (low["precio"] != null ? low["precio"] : low["precio por unidad"]);
          var min = low["minimo (kg)"] != null ? low["minimo (kg)"] : low["minimo"];
          rows.push({ name: String(name).trim(), rolls: hasRl ? Math.round(parseNumber(rl)) : null, kg: hasKg ? parseNumber(kg) : null, price: price === "" || price == null ? null : parseNumber(price), min: min === "" || min == null ? null : parseNumber(min) });
        });
        if (rows.length) applyList(rows); else toast("No encontré columnas Tela, Rollos o Kilos en el archivo");
      } catch (e) { toast("No pude leer ese archivo"); }
      inp.value = "";
    };
    rd.readAsArrayBuffer(f);
  });

  /* descargas */
  function saveBlob(name, blob, okText) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000); toast(okText);
  }
  function exportXlsx() {
    var wb = XLSX.utils.book_new();
    var stock = state.items.map(function (i) { return { "Tela": i.name, "Rollos": i.rolls || 0, "Kilos totales": i.stock, "Precio de lista": i.price, "Mínimo (kg)": i.min, "Valor a precio de lista": r2(i.stock * i.price) }; });
    var sales = state.sales.map(function (s) { return { "Fecha": new Date(s.ts).toLocaleDateString("es-AR"), "Hora": hhmm(s.ts), "Tela": s.name, "Rollos": s.rolls || 0, "Kilos": s.qty, "Precio por kilo": s.price, "Total": s.total, "Pago": payLabel(s), "Efectivo": payAmt(s, "Efectivo"), "Transferencia": payAmt(s, "Transferencia"), "Débito": payAmt(s, "Débito"), "Crédito": payAmt(s, "Crédito"), "Queda debiendo": payAmt(s, "Deuda"), "Cliente": s.note, "Nota": s.note, "Estado": s.voided ? "ANULADA" : "Válida" }; });
    var moves = state.moves.map(function (m) { return { "Fecha": new Date(m.ts).toLocaleDateString("es-AR"), "Hora": hhmm(m.ts), "Tela": m.name, "Tipo": m.type, "Rollos": m.rolls || 0, "Kilos": m.qty, "Rollos resultantes": m.rollsAfter != null ? m.rollsAfter : "", "Kilos resultantes": m.stockAfter, "Nota": m.note }; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stock), "Stock");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sales.length ? sales : [{ "Fecha": "" }]), "Ventas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(moves.length ? moves : [{ "Fecha": "" }]), "Movimientos");
    var cierres = [];
    function crow(d, x, estado) { var b = x.byMethod || {}; return { "Fecha": d, "Estado": estado, "Fondo inicial": x.opening, "Ventas efectivo": b.Efectivo || 0, "Transferencia": b.Transferencia || 0, "Débito": b["Débito"] || 0, "Crédito": b["Crédito"] || 0, "Total cobrado": x.total, "Retiros y gastos": x.expenses, "Debía haber": x.expected, "Contado": x.counted, "Diferencia": x.diff, "Hora de cierre": hhmm(x.ts) }; }
    Object.keys(state.cash).sort().forEach(function (d) { var c = state.cash[d]; (c.history || []).forEach(function (x) { cierres.push(crow(d, x, "Reabierta")); }); if (c.closed) cierres.push(crow(d, c.closed, "Cerrada")); });
    var retiros = state.expenses.map(function (e) { return { "Fecha": e.day, "Hora": hhmm(e.ts), "Monto": e.amount, "Motivo": e.note }; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cierres.length ? cierres : [{ "Fecha": "" }]), "Cierres de caja");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(retiros.length ? retiros : [{ "Fecha": "" }]), "Retiros y gastos");
    var deudoresRows = debtors().map(function (e) { return { "Cliente": e.name, "Le vendiste a deber": e.owed, "Pagó": e.paid, "Debe": e.balance }; });
    var cobrosRows = state.collections.map(function (c) { return { "Fecha": new Date(c.ts).toLocaleDateString("es-AR"), "Hora": hhmm(c.ts), "Cliente": c.client, "Monto": c.amount, "Forma de pago": c.method, "Nota": c.note, "Estado": c.voided ? "ANULADO" : "Válido" }; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deudoresRows.length ? deudoresRows : [{ "Cliente": "" }]), "Deudores");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cobrosRows.length ? cobrosRows : [{ "Fecha": "" }]), "Cobros de deudas");
    var buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveBlob("textil-oriente-" + dayKey(Date.now()) + ".xlsx", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Excel descargado");
  }
  $("#btn-export").addEventListener("click", exportXlsx);

  /* copia de seguridad */
  function backupNote() {
    var el = $("#backup-note"), t = state.lastBackup;
    if (!t) { el.textContent = "Todo se guarda solo en el servidor, con puntos de restauración cada 15 minutos. Tocá Guardar todo para bajar además una copia a tu computadora."; el.style.color = ""; return; }
    var d = Math.floor((Date.now() - t) / 86400000);
    el.textContent = d < 1 ? "Copia de seguridad descargada hoy." : "Última copia descargada: hace " + d + (d === 1 ? " día." : " días.");
    el.style.color = "";
  }
  var pendingRestore = null;
  $("#btn-backup").addEventListener("click", function () {
    state.lastBackup = Date.now(); save(); backupNote();
    saveBlob("textil-oriente-copia-" + dayKey(Date.now()) + ".json", new Blob([JSON.stringify(state)], { type: "application/json" }), "Copia descargada");
    setTimeout(exportXlsx, 500); // también baja el Excel, así queda todo guardado en la compu
  });
  $("#btn-restore").addEventListener("click", function () {
    var btn = this;
    if (pendingRestore) { state = pendingRestore; pendingRestore = null; btn.textContent = "Restaurar copia"; save("Copia restaurada"); renderStock(); backupNote(); return; }
    $("#file-restore").click();
  });
  $("#file-restore").addEventListener("change", function () {
    var f = this.files[0], inp = this, btn = $("#btn-restore"); if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var o = JSON.parse(rd.result);
        if (!o || !Array.isArray(o.items) || !Array.isArray(o.sales)) throw new Error("bad");
        o.moves = o.moves || []; o.cash = o.cash || {}; o.expenses = o.expenses || [];
        pendingRestore = o; btn.textContent = "¿Reemplazar todo con esta copia?";
        setTimeout(function () { if (pendingRestore === o) { pendingRestore = null; btn.textContent = "Restaurar copia"; } }, 6000);
      } catch (e) { toast("Ese archivo no es una copia de seguridad válida"); }
      inp.value = "";
    };
    rd.readAsText(f);
  });

  /* ---------- cierre de caja ---------- */
  function cashOf(day) { if (!state.cash[day]) state.cash[day] = { opening: 0, counted: "", closed: null, history: [] }; return state.cash[day]; }
  var armedClose = false, armedReopen = false;
  function renderCierre(day, by) {
    var c = cashOf(day), body = $("#cierre-body"), locked = !!c.closed;
    var exps = state.expenses.filter(function (e) { return e.day === day; }), expTotal = 0;
    exps.forEach(function (e) { expTotal = r2(expTotal + e.amount); });
    var cashSales = by.Efectivo || 0, expected = r2((c.opening || 0) + cashSales - expTotal);
    var line = function (label, val, strong) { return h("div", { class: "cl" + (strong ? " strong" : "") }, h("span", { text: label }), h("b", { text: val })); };
    body.textContent = "";
    var open = h("input", { id: "c-open", type: "number", min: "0", step: "any", inputmode: "decimal", value: c.opening ? String(c.opening) : "", placeholder: "0" });
    open.disabled = locked;
    open.addEventListener("change", function () { c.opening = r2(Math.max(0, num(open.value))); save(); renderCaja(); });
    body.appendChild(h("label", { for: "c-open" }, "Fondo inicial: efectivo con el que abrís", open));
    body.appendChild(line("+ Ventas en efectivo", money(cashSales)));
    exps.forEach(function (e) {
      body.appendChild(h("div", { class: "cl" }, h("span", { class: "hint", text: hhmm(e.ts) + " · " + (e.note || "Retiro") }), h("b", { text: "− " + money(e.amount) }),
        locked ? null : h("button", { class: "sm ghost danger", text: "Quitar", onclick: function () { state.expenses = state.expenses.filter(function (x) { return x.id !== e.id; }); save(); renderCaja(); } })));
    });
    if (!locked) {
      var amt = h("input", { id: "c-exp-amt", type: "number", min: "0", step: "any", inputmode: "decimal", placeholder: "Monto" });
      var note = h("input", { id: "c-exp-note", type: "text", placeholder: "Motivo (ej. retiro, flete, almuerzo)" });
      body.appendChild(h("div", { class: "row2" }, h("label", { for: "c-exp-amt" }, "Retiro o gasto en efectivo", amt), h("label", { for: "c-exp-note" }, "Motivo", note)));
      body.appendChild(h("button", { text: "Registrar retiro o gasto", onclick: function () {
        var a = r2(num(amt.value)); if (a <= 0) { toast("Poné el monto del retiro"); return; }
        state.expenses.push({ id: uid(), ts: Date.now(), day: day, amount: a, note: note.value.trim() }); save("Retiro registrado"); renderCaja();
      } }));
    }
    body.appendChild(line("− Retiros y gastos", money(expTotal)));
    body.appendChild(line("Efectivo que debería haber", money(expected), true));
    var counted = h("input", { id: "c-counted", type: "number", min: "0", step: "any", inputmode: "decimal", placeholder: "Contá los billetes y poné el total", value: locked ? String(c.closed.counted) : String(c.counted || "") });
    counted.disabled = locked;
    var diff = h("div", { class: "diff", "aria-live": "polite" });
    function paintDiff() {
      var raw = counted.value; if (raw === "" || !isFinite(parseFloat(raw))) { diff.textContent = "Contá el efectivo para ver la diferencia"; diff.className = "diff"; diff.style.color = "var(--muted)"; return; }
      var d = r2(parseFloat(raw) - expected); diff.style.color = "";
      if (d === 0) { diff.textContent = "Caja exacta"; diff.className = "diff ok"; }
      else if (d > 0) { diff.textContent = "Sobran " + money(d); diff.className = "diff over"; }
      else { diff.textContent = "Faltan " + money(-d); diff.className = "diff bad"; }
    }
    var closeBtn = h("button", { class: "primary big", text: "Cerrar la caja del día" });
    counted.addEventListener("input", function () { c.counted = counted.value; armedClose = false; closeBtn.textContent = "Cerrar la caja del día"; paintDiff(); });
    counted.addEventListener("change", function () { save(); });
    body.appendChild(h("label", { for: "c-counted" }, "Efectivo contado en la caja", counted));
    body.appendChild(diff);
    paintDiff();
    if (locked) {
      var x = c.closed;
      body.appendChild(h("p", { class: "closedtag", text: "Caja cerrada a las " + hhmm(x.ts) + " · Total cobrado: " + money(x.total) + " en " + x.salesCount + (x.salesCount === 1 ? " venta" : " ventas") }));
      var re = h("button", { text: "Reabrir caja" });
      re.addEventListener("click", function () {
        if (!armedReopen) { armedReopen = true; re.textContent = "¿Seguro? Queda registrado"; setTimeout(function () { armedReopen = false; re.textContent = "Reabrir caja"; }, 3500); return; }
        c.history.push(c.closed); c.closed = null; armedReopen = false; save("Caja reabierta. El cierre anterior quedó guardado."); renderCaja();
      });
      body.appendChild(re);
    } else {
      closeBtn.addEventListener("click", function () {
        if (counted.value === "" || !isFinite(parseFloat(counted.value))) { toast("Primero contá el efectivo y escribilo"); counted.focus(); return; }
        if (!armedClose) { armedClose = true; closeBtn.textContent = "¿Confirmás el cierre?"; setTimeout(function () { armedClose = false; closeBtn.textContent = "Cerrar la caja del día"; }, 4000); return; }
        var cnt = state.sales.filter(function (s) { return dayKey(s.ts) === day && !s.voided; }).length, tot = 0;
        Object.keys(by).forEach(function (k) { tot = r2(tot + by[k]); });
        var cn = r2(parseFloat(counted.value));
        c.closed = { ts: Date.now(), opening: c.opening || 0, byMethod: JSON.parse(JSON.stringify(by)), total: tot, salesCount: cnt, expenses: expTotal, expected: expected, counted: cn, diff: r2(cn - expected) };
        c.counted = ""; armedClose = false; save("Caja cerrada y guardada"); renderCaja();
      });
      body.appendChild(closeBtn);
    }
  }

  /* ---------- caja ---------- */
  function fillSelect() {
    var sel = $("#s-item"), prev = sel.value; sel.textContent = "";
    state.items.forEach(function (i) { sel.appendChild(h("option", { value: i.id, text: i.name + " · " + fmt(i.rolls || 0) + " rollos · " + fmt(i.stock) + " kg" })); });
    if (prev && itemById(prev)) sel.value = prev;
    syncPrice();
  }
  // El precio es manual en cada venta (cambia según el cliente): solo se muestra el de lista como referencia.
  function syncPrice() {
    var i = itemById($("#s-item").value), ref = $("#s-ref");
    ref.textContent = i && i.price ? "Precio de lista de referencia: " + money(i.price) + " por kilo" : "";
    calc();
  }
  function calc() { $("#s-total").textContent = money(r2(num($("#s-qty").value) * num($("#s-price").value))); updateSplitHint(); }
  /* ---------- pago dividido ---------- */
  var SPLIT = { "Efectivo": "sp-ef", "Transferencia": "sp-tr", "Débito": "sp-de", "Crédito": "sp-cr", "Deuda": "sp-deu" };
  var lab = function (m) { return m === "Deuda" ? "Queda debiendo" : m; };
  var splitMode = false;
  function curTotal() { return r2(num($("#s-qty").value) * num($("#s-price").value)); }
  function payAmounts(sl) { return Array.isArray(sl.payments) && sl.payments.length ? sl.payments : [{ method: sl.method, amount: sl.total }]; }
  function payLabel(sl) { var p = payAmounts(sl); return p.length > 1 ? p.map(function (x) { return lab(x.method) + " " + money(x.amount); }).join(" + ") : lab(p[0].method); }
  function payAmt(sl, m) { var t = 0; payAmounts(sl).forEach(function (x) { if (x.method === m) t = r2(t + x.amount); }); return t; }
  function setSplit(on) {
    splitMode = on;
    $("#s-split-box").hidden = !on; $("#s-method-wrap").hidden = on;
    $("#s-split").textContent = on ? "Pagar con una sola forma" : "Dividir el pago (por ej. efectivo + transferencia)";
    updateSplitHint();
  }
  function resetSplit() { Object.keys(SPLIT).forEach(function (m) { $("#" + SPLIT[m]).value = ""; }); setSplit(false); }
  function updateSplitHint() {
    if (!splitMode) return;
    var sum = 0; Object.keys(SPLIT).forEach(function (m) { sum = r2(sum + r2(Math.max(0, num($("#" + SPLIT[m]).value)))); });
    var total = curTotal(), d = r2(total - sum), el = $("#sp-resto"); el.textContent = "";
    if (total <= 0) { el.textContent = "Primero poné los kilos y el precio de la venta."; el.className = "splitresto"; return; }
    if (d === 0) { el.textContent = "Pago completo: " + money(total); el.className = "splitresto okline"; return; }
    el.className = "splitresto";
    el.appendChild(document.createTextNode(d > 0 ? "Falta cobrar " + money(d) + ". " : "Te pasaste por " + money(-d) + ". "));
    if (d > 0) Object.keys(SPLIT).forEach(function (m) {
      el.appendChild(h("button", { type: "button", class: "sm linkbtn", text: "Poner el resto " + (m === "Deuda" ? "como deuda" : "en " + m.toLowerCase()), onclick: function () { var inp = $("#" + SPLIT[m]); inp.value = String(r2(num(inp.value) + d)); updateSplitHint(); } }));
    });
  }
  $("#s-split").addEventListener("click", function () { setSplit(!splitMode); });
  Object.keys(SPLIT).forEach(function (m) { $("#" + SPLIT[m]).addEventListener("input", updateSplitHint); });

  $("#s-item").addEventListener("change", syncPrice);
  $("#s-qty").addEventListener("input", calc); $("#s-price").addEventListener("input", calc);
  $("#sale-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    if ($("#s-submit").disabled) return;
    var i = itemById($("#s-item").value), qty = num($("#s-qty").value), rolls = Math.round(num($("#s-rolls").value)), price = num($("#s-price").value), msg = $("#s-msg");
    msg.textContent = "";
    if (conflict) { msg.textContent = "Se está actualizando la pantalla. Esperá un momento."; return; }
    if (cashOf(dayKey(Date.now())).closed) { msg.textContent = "La caja de hoy está cerrada. Reabrila abajo para seguir vendiendo."; return; }
    if (!i) { msg.textContent = "Elegí una tela."; return; }
    if (qty <= 0) { msg.textContent = "Poné los kilos de la venta."; return; }
    if (price <= 0) { msg.textContent = "Poné el precio de esta venta (por kilo)."; return; }
    if (price > 10000000 || qty * price > 1000000000) { msg.textContent = "El precio o el total parece demasiado alto. Revisá los ceros."; return; }
    if (qty > i.stock) { msg.textContent = "No alcanza el stock: quedan " + fmt(i.stock) + " kg. Si todavía no cargaste los kilos de esta tela, cargalos en la tabla."; return; }
    if (rolls < 0) { msg.textContent = "Los rollos no pueden ser negativos."; return; }
    if (rolls > (i.rolls || 0)) { msg.textContent = "No hay tantos rollos: quedan " + fmt(i.rolls || 0) + "."; return; }
    var total = r2(qty * price), payments = [];
    if (splitMode) {
      var sum = 0;
      Object.keys(SPLIT).forEach(function (m) { var a = r2(Math.max(0, num($("#" + SPLIT[m]).value))); if (a > 0) { payments.push({ method: m, amount: a }); sum = r2(sum + a); } });
      if (!payments.length) { msg.textContent = "Poné cuánto paga con cada forma de pago."; return; }
      if (sum !== total) { var dd = r2(total - sum); msg.textContent = "Los pagos suman " + money(sum) + " y la venta es de " + money(total) + ". " + (dd > 0 ? "Faltan " + money(dd) : "Sobran " + money(-dd)) + "."; return; }
    } else { payments = [{ method: $("#s-method").value, amount: total }]; }
    var debt = 0; payments.forEach(function (p) { if (p.method === "Deuda") debt = r2(debt + p.amount); });
    if (debt > 0 && !$("#s-note").value.trim()) { msg.textContent = "Queda debiendo " + money(debt) + ": poné el nombre del cliente en \"Cliente o nota\"."; return; }
    var sb = $("#s-submit"); sb.disabled = true; setTimeout(function () { sb.disabled = false; }, 1200);
    i.stock = Math.round((i.stock - qty) * 1000) / 1000; i.rolls = (i.rolls || 0) - rolls;
    var s = { id: uid(), ts: Date.now(), itemId: i.id, name: i.name, unit: "kg", rolls: rolls, qty: qty, price: price, total: total, method: payments.length > 1 ? "Mixto" : payments[0].method, payments: payments, note: $("#s-note").value.trim() };
    state.sales.push(s); logMove(i, "venta", -qty, s.note, -rolls);
    $("#day").value = dayKey(Date.now()); $("#s-qty").value = ""; $("#s-rolls").value = ""; $("#s-price").value = ""; $("#s-note").value = ""; resetSplit(); renderStock();
    save("Venta guardada: " + money(s.total));
  });
  function renderCaja() {
    if (!$("#day").value) $("#day").value = dayKey(Date.now());
    var day = $("#day").value;
    var list = state.sales.filter(function (sl) { return dayKey(sl.ts) === day; });
    var cobros = state.collections.filter(function (c) { return dayKey(c.ts) === day; });
    var by = { Efectivo: 0, Transferencia: 0, "Débito": 0, "Crédito": 0 }, debtToday = 0;
    list.forEach(function (sl) { if (sl.voided) return; payAmounts(sl).forEach(function (p) { if (p.method === "Deuda") debtToday = r2(debtToday + p.amount); else by[p.method] = r2((by[p.method] || 0) + p.amount); }); });
    cobros.forEach(function (c) { if (c.voided) return; by[c.method] = r2((by[c.method] || 0) + c.amount); });
    var total = 0; Object.keys(by).forEach(function (k) { total = r2(total + by[k]); });
    var box = $("#stats-caja"); box.textContent = "";
    box.appendChild(h("div", { class: "stat main" }, h("small", { text: "Cobrado del día" }), h("b", { text: money(total) })));
    Object.keys(by).forEach(function (k) { box.appendChild(h("div", { class: "stat" }, h("small", { text: k }), h("b", { text: money(by[k]) }))); });
    if (debtToday > 0) box.appendChild(h("div", { class: "stat warn main" }, h("small", { text: "Quedó debiendo hoy" }), h("b", { text: money(debtToday) })));
    renderCierre(day, by);
    var rows = list.map(function (sl) { return { ts: sl.ts, s: sl }; }).concat(cobros.map(function (c) { return { ts: c.ts, c: c }; })).sort(function (x, y) { return y.ts - x.ts; });
    var tb = $("#tb-sales"); tb.textContent = "";
    if (!rows.length) tb.appendChild(h("tr", null, h("td", { colspan: "3", class: "empty", text: "No hay ventas ni cobros en este día." })));
    rows.forEach(function (r) {
      if (r.s) {
        var sl = r.s;
        tb.appendChild(h("tr", null,
          h("td", null, h("div", { class: "t", text: sl.name }), h("div", { class: "hint", text: hhmm(sl.ts) + " · " + (sl.rolls ? sl.rolls + (sl.rolls === 1 ? " rollo · " : " rollos · ") : "") + fmt(sl.qty) + " kg × " + money(sl.price) + " · " + payLabel(sl) + (sl.note ? " · " + sl.note : "") })),
          h("td", { class: "num t", text: money(sl.total), style: sl.voided ? "text-decoration:line-through;color:var(--muted)" : "" }),
          h("td", { class: "actions" }, sl.voided ? h("span", { class: "pill", text: "Anulada " + hhmm(sl.voided) }) : h("button", { class: "sm ghost danger", text: "Anular", onclick: function (ev) { voidSale(sl, ev.currentTarget); } }))));
      } else {
        var c = r.c;
        tb.appendChild(h("tr", null,
          h("td", null, h("div", { class: "t", text: "Cobro de deuda: " + c.client }), h("div", { class: "hint", text: hhmm(c.ts) + " · " + c.method + (c.note ? " · " + c.note : "") })),
          h("td", { class: "num t", text: money(c.amount), style: c.voided ? "text-decoration:line-through;color:var(--muted)" : "" }),
          h("td", { class: "actions" }, c.voided ? h("span", { class: "pill", text: "Anulado " + hhmm(c.voided) }) : h("button", { class: "sm ghost danger", text: "Anular", onclick: function (ev) { voidCollection(c, ev.currentTarget); } }))));
      }
    });
    renderDeudores();
  }

  /* ---------- deudores ---------- */
  function debtors() {
    var map = {};
    function entry(name) { var k = norm(name); return map[k] || (map[k] = { key: k, name: name.trim(), owed: 0, paid: 0, sales: [], pays: [] }); }
    state.sales.forEach(function (sl) { if (sl.voided) return; var d = payAmt(sl, "Deuda"); if (d > 0 && norm(sl.note || "")) { var e = entry(sl.note); e.owed = r2(e.owed + d); e.sales.push({ ts: sl.ts, name: sl.name, amount: d }); } });
    state.collections.forEach(function (c) { if (c.voided) return; var e = entry(c.client); e.paid = r2(e.paid + c.amount); e.pays.push(c); });
    return Object.keys(map).map(function (k) { var e = map[k]; e.balance = r2(e.owed - e.paid); return e; }).filter(function (e) { return e.balance !== 0; }).sort(function (x, y) { return y.balance - x.balance; });
  }
  var openDebtor = null;
  function shortDate(ts) { return new Date(ts).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" }); }
  function renderDeudores() {
    var body = $("#deudores-body"); if (!body) return; body.textContent = "";
    var list = debtors(), totalDebt = 0;
    list.forEach(function (e) { if (e.balance > 0) totalDebt = r2(totalDebt + e.balance); });
    $("#deudores-title").textContent = "Deudores" + (totalDebt > 0 ? " · te deben " + money(totalDebt) : "");
    if (!list.length) { body.appendChild(h("p", { class: "hint", text: "Nadie debe plata. Cuando una venta quede debiendo, el cliente aparece acá." })); return; }
    list.forEach(function (e) {
      var isOpen = openDebtor === e.key;
      var head = h("div", { class: "debhead" },
        h("div", null, h("b", { text: e.name }), h("div", { class: "hint", text: e.balance > 0 ? "Le vendiste a deber " + money(e.owed) + " · pagó " + money(e.paid) : "Pagó de más: saldo a favor" })),
        h("div", { class: "debowed", text: e.balance > 0 ? money(e.balance) : "a favor " + money(-e.balance) }));
      var wrap = h("div", { class: "deb" }, head);
      if (e.balance > 0) {
        wrap.appendChild(h("button", { class: "sm", text: isOpen ? "Cancelar" : "Registrar pago", onclick: function () { openDebtor = isOpen ? null : e.key; renderDeudores(); } }));
      }
      if (isOpen && e.balance > 0) {
        var amt = h("input", { id: "d-amt", type: "number", min: "0", step: "any", inputmode: "decimal", value: String(e.balance) });
        var met = h("select", { id: "d-met" }, h("option", { text: "Efectivo" }), h("option", { text: "Transferencia" }), h("option", { text: "Débito" }), h("option", { text: "Crédito" }));
        var note = h("input", { id: "d-note", type: "text", placeholder: "Nota (opcional)" });
        wrap.appendChild(h("div", { class: "debform" }, h("label", { for: "d-amt" }, "Cuánto paga", amt), h("label", { for: "d-met" }, "Forma de pago", met), h("label", { for: "d-note" }, "Nota", note)));
        wrap.appendChild(h("button", { class: "primary", text: "Cobrar y sumar a la caja de hoy", onclick: function () {
          var a = r2(num(amt.value));
          if (a <= 0) { toast("Poné cuánto pagó"); return; }
          if (a > e.balance) { toast("Debe " + money(e.balance) + ": no podés cobrar más que eso."); return; }
          if (cashOf(dayKey(Date.now())).closed) { toast("La caja de hoy está cerrada. Reabrila para registrar el cobro."); return; }
          state.collections.push({ id: uid(), ts: Date.now(), client: e.name, amount: a, method: met.value, note: note.value.trim() });
          openDebtor = null; $("#day").value = dayKey(Date.now()); renderCaja();
          save("Cobro registrado: " + money(a) + " de " + e.name);
        } }));
      }
      var det = h("div", { class: "debdetail" });
      e.sales.forEach(function (x) { det.appendChild(h("div", { text: shortDate(x.ts) + " · " + x.name + " · quedó debiendo " + money(x.amount) })); });
      e.pays.forEach(function (c) { det.appendChild(h("div", { text: shortDate(c.ts) + " · pagó " + money(c.amount) + " (" + c.method + ")" })); });
      wrap.appendChild(det);
      body.appendChild(wrap);
    });
  }
  var armedCob = null;
  function voidCollection(c, btn) {
    if (cashOf(dayKey(c.ts)).closed) { toast("La caja de ese día está cerrada. Reabrila para anular."); return; }
    if (armedCob !== btn) { armedCob = btn; btn.textContent = "¿Seguro?"; setTimeout(function () { if (armedCob === btn) { btn.textContent = "Anular"; armedCob = null; } }, 3000); return; }
    c.voided = Date.now(); armedCob = null; renderCaja(); save("Cobro anulado: la deuda vuelve");
  }
  var armedSale = null;
  function voidSale(s, btn) {
    if (cashOf(dayKey(s.ts)).closed) { toast("La caja de ese día está cerrada. Reabrila para anular."); return; }
    if (armedSale !== btn) { armedSale = btn; btn.textContent = "¿Seguro?"; setTimeout(function () { if (armedSale === btn) { btn.textContent = "Anular"; armedSale = null; } }, 3000); return; }
    var i = itemById(s.itemId); if (i) { i.stock = Math.round((i.stock + s.qty) * 1000) / 1000; i.rolls = (i.rolls || 0) + (s.rolls || 0); logMove(i, "anulación", s.qty, "Venta anulada", s.rolls || 0); }
    s.voided = Date.now(); armedSale = null; renderStock(); save("Venta anulada, el stock volvió");
  }
  $("#day").addEventListener("change", renderCaja);

  renderStock(); backupNote();

  if (readOnly) {
    // Solo lectura: se puede mirar y descargar el Excel, nada más. El servidor también lo impide.
    root.classList.add("ro");
    var keep = { q: 1, day: 1, "btn-export": 1 };
    var lock = function () {
      root.querySelectorAll("input,select,textarea,button").forEach(function (el) {
        if (keep[el.id]) return;
        el.disabled = true;
        if (el.tagName === "BUTTON") el.hidden = true;
      });
    };
    lock();
    new MutationObserver(lock).observe(root, { childList: true, subtree: true });
    setStatus("Modo solo lectura: podés mirar todo y descargar el Excel, pero no cambiar nada.", "");
  }

  return function dispose() {
    disposed = true;
    clearTimeout(saveTimer); clearTimeout(retryTimer); clearTimeout(toastTimer);
    window.removeEventListener("beforeunload", beforeUnload);
  };
};
