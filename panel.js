// Panel de stock y caja (lógica). Se monta con window.mountPanel y guarda con saveState().
const PANEL_HTML = `
<div class="savebar" id="savebar" role="status" aria-live="polite"></div>
<div class="panel">
  <section id="view-stock" class="stack" aria-label="Stock">
    <div class="stats" id="stats-stock"></div>
    <div class="loadcard">
      <div class="loadtext">
        <b>¿Tenés el stock anotado?</b>
        <span>Pegá la lista de stock tal como la anotás, por ejemplo "Morley est 494", y se carga sola.</span>
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
    <p class="hint">Tocá cualquier número para cambiarlo, el precio también. Todo se guarda solo en el servidor. El stock en amarillo es el que hay que reponer.</p>
    <div class="tablebox">
      <table>
        <thead><tr><th>Tela</th><th>Unidad</th><th class="num">Stock</th><th class="num">Precio</th><th class="num">Mínimo</th><th class="num">Valor</th><th></th></tr></thead>
        <tbody id="tb-stock"></tbody>
      </table>
    </div>
  </section>

  <section id="view-caja" class="stack" aria-label="Caja">
    <form class="card" id="sale-form" autocomplete="off">
      <h2 class="title">Caja · Nueva venta</h2>
      <label for="s-item">Tela<select id="s-item"></select></label>
      <div class="row2">
        <label for="s-qty">Cantidad<input id="s-qty" type="number" min="0" step="any" inputmode="decimal" value="1"></label>
        <label for="s-price">Precio unitario<input id="s-price" type="number" min="0" step="any" inputmode="decimal"></label>
      </div>
      <div class="row2">
        <label for="s-method">Forma de pago
          <select id="s-method"><option>Efectivo</option><option>Transferencia</option><option>Débito</option><option>Crédito</option></select>
        </label>
        <label for="s-note">Cliente o nota<input id="s-note" type="text" placeholder="Opcional"></label>
      </div>
      <div class="total"><span class="hint">Total</span><b id="s-total">$ 0</b></div>
      <p class="msg" id="s-msg" role="alert"></p>
      <button class="primary big" id="s-submit" type="submit">Cobrar y descontar stock</button>
    </form>

    <div class="bar"><label for="day" style="grid-auto-flow:column;align-items:center;gap:10px">Día<input id="day" type="date"></label></div>
    <div class="methods" id="stats-caja"></div>
    <div class="card" id="cierre"><h2 class="title">Cierre de caja</h2><div id="cierre-body" class="stack"></div></div>
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
    <p class="hint">Una tela por línea, con el nombre y el número. Sirve tal como lo anotás: "Stock morley est 494" o "Lino liso 2.510". Las telas que ya existen se actualizan y las nuevas se agregan.</p>
    <textarea id="paste-text" placeholder="Morley est 494&#10;Wafle 615&#10;Lino liso 2.510"></textarea>
    <div class="dlgbtns"><button type="button" class="ghost" id="paste-cancel">Cancelar</button><button type="submit" class="primary">Cargar</button></div>
  </form>
</dialog>

<dialog id="dlg-in">
  <form method="dialog" id="f-in">
    <h2 id="in-title">Entró mercadería</h2>
    <label for="in-qty">Cantidad que entra<input id="in-qty" type="number" min="0" step="any" inputmode="decimal"></label>
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

window.mountPanel = function mountPanel(root, { initialData, initialVersion, onConflict, saveState }) {
  root.innerHTML = PANEL_HTML;
  var disposed = false;
  var uid = function () { return Math.random().toString(36).slice(2, 10); };

  var state = initialData && initialData.items ? initialData : {
    items: SEED.map(function (r) { return { id: uid(), name: r[0], unit: "kg", stock: r[1], price: 0, min: 100 }; }),
    sales: [], moves: [], cash: {}, expenses: [],
  };
  var fin = function (v) { v = +v; return isFinite(v) ? v : 0; };
  state.items = (Array.isArray(state.items) ? state.items : []).filter(function (i) { return i && typeof i === "object" && typeof i.name === "string"; }).map(function (i) {
    return { id: String(i.id || uid()), name: i.name, unit: ["kg", "m", "u"].indexOf(i.unit) >= 0 ? i.unit : "kg", stock: fin(i.stock), price: fin(i.price), min: fin(i.min) };
  });
  state.sales = (Array.isArray(state.sales) ? state.sales : []).filter(function (s) { return s && typeof s === "object"; });
  state.moves = Array.isArray(state.moves) ? state.moves : [];
  state.expenses = Array.isArray(state.expenses) ? state.expenses : [];
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
    if (conflict) return;
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
  if (initialVersion === 0) save();
  else setStatus("Todo guardado en el servidor", "ok");

  function itemById(id) { return state.items.filter(function (i) { return i.id === id; })[0]; }
  function logMove(item, type, qty, note) { state.moves.push({ id: uid(), ts: Date.now(), itemId: item.id, name: item.name, type: type, qty: qty, stockAfter: item.stock, note: note || "" }); }

  /* ---------- stock ---------- */
  function isLow(i) { return i.min > 0 && i.stock < i.min; }
  function renderStats() {
    var total = 0, value = 0, low = 0, noPrice = 0;
    state.items.forEach(function (i) { total += i.stock; value += i.stock * i.price; if (isLow(i)) low++; if (!i.price) noPrice++; });
    var box = $("#stats-stock"); box.textContent = "";
    [["Telas", String(state.items.length), ""], ["Stock total", fmt(total), ""], ["Valor en stock", money(value), ""],
     ["Para reponer", String(low), low ? "warn" : ""], ["Sin precio", String(noPrice), noPrice ? "warn" : ""]].forEach(function (s) {
      box.appendChild(h("div", { class: "stat " + s[2] }, h("small", { text: s[0] }), h("b", { text: s[1] })));
    });
  }
  function paintRow(tr, i) {
    tr.classList.toggle("low", isLow(i)); tr.classList.toggle("noprice", !i.price);
    var v = tr.querySelector(".val"); v.textContent = i.price ? money(i.stock * i.price) : "Falta precio"; v.classList.toggle("missing", !i.price);
  }
  function numInput(item, field) {
    var inp = h("input", { class: "n", type: "number", step: "any", min: "0", inputmode: "decimal", value: String(item[field]), "aria-label": field + " de " + item.name });
    inp.addEventListener("change", function () {
      var v = Math.max(0, num(inp.value)); var old = item[field]; item[field] = v; inp.value = String(v);
      if (field === "stock" && v !== old) logMove(item, "ajuste", v - old, "Edición manual");
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
      var unit = h("select", { "aria-label": "Unidad de " + i.name }, h("option", { text: "kg" }), h("option", { text: "m" }), h("option", { text: "u" }));
      unit.value = i.unit; unit.addEventListener("change", function () { i.unit = unit.value; save(); fillSelect(); });
      var tr = h("tr", null,
        h("td", null, name), h("td", null, unit),
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
    var it = { id: uid(), name: "Nueva tela", unit: "kg", stock: 0, price: 0, min: 100 };
    state.items.unshift(it); $("#q").value = ""; save(); renderStock();
    var first = $("#tb-stock input"); if (first) { first.focus(); first.select(); }
  });

  /* ingreso */
  var ingresoItem = null;
  function openIngreso(i) { ingresoItem = i; $("#in-title").textContent = "Entró: " + i.name; $("#in-qty").value = ""; $("#in-note").value = ""; $("#dlg-in").showModal(); $("#in-qty").focus(); }
  $("#in-cancel").addEventListener("click", function () { $("#dlg-in").close(); });
  $("#f-in").addEventListener("submit", function () {
    var q = num($("#in-qty").value); if (!ingresoItem || q <= 0) return;
    ingresoItem.stock = Math.round((ingresoItem.stock + q) * 1000) / 1000; logMove(ingresoItem, "ingreso", q, $("#in-note").value);
    save("Sumaste " + fmt(q) + " " + ingresoItem.unit + " a " + ingresoItem.name); renderStock();
  });

  /* pegar lista */
  function parseNumber(s) { s = String(s).replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."); return parseFloat(s); }
  function applyList(rows) {
    var upd = 0, add = 0;
    rows.forEach(function (r) {
      var found = state.items.filter(function (i) { return norm(i.name) === norm(r.name); })[0];
      if (found) {
        var old = found.stock; found.stock = r.stock; if (r.price != null) found.price = r.price; if (r.min != null) found.min = r.min; if (r.unit) found.unit = r.unit;
        if (r.stock !== old) logMove(found, "ajuste", r.stock - old, "Carga de lista"); upd++;
      } else {
        var it = { id: uid(), name: r.name, unit: r.unit || "kg", stock: r.stock, price: r.price || 0, min: r.min != null ? r.min : 100 };
        state.items.push(it); logMove(it, "alta", r.stock, "Carga de lista"); add++;
      }
    });
    save(upd + " actualizadas, " + add + " nuevas"); renderStock();
  }
  $("#btn-paste").addEventListener("click", function () { $("#dlg-paste").showModal(); $("#paste-text").focus(); });
  $("#paste-cancel").addEventListener("click", function () { $("#dlg-paste").close(); });
  $("#f-paste").addEventListener("submit", function () {
    var rows = [];
    $("#paste-text").value.split(/\r?\n/).forEach(function (line) {
      var m = line.trim().match(/^(?:stock\s+)?(.+?)[\s:=-]+([\d.,]+)\s*$/i);
      if (m && /[a-zA-ZÀ-ÿ]/.test(m[1]) && isFinite(parseNumber(m[2]))) rows.push({ name: m[1].trim().replace(/^./, function (c) { return c.toUpperCase(); }), stock: parseNumber(m[2]) });
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
          var name = low["tela"] || low["nombre"] || low["producto"]; var stock = low["stock"] != null ? low["stock"] : low["cantidad"];
          if (!name || stock === "" || !isFinite(parseNumber(stock))) return;
          var price = low["precio"] != null ? low["precio"] : low["precio por unidad"];
          var min = low["minimo"];
          rows.push({ name: String(name).trim(), stock: parseNumber(stock), unit: low["unidad"] || "", price: price === "" || price == null ? null : parseNumber(price), min: min === "" || min == null ? null : parseNumber(min) });
        });
        if (rows.length) applyList(rows); else toast("No encontré columnas Tela y Stock en el archivo");
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
    var stock = state.items.map(function (i) { return { "Tela": i.name, "Unidad": i.unit, "Stock": i.stock, "Precio": i.price, "Mínimo": i.min, "Valor en stock": r2(i.stock * i.price) }; });
    var sales = state.sales.map(function (s) { return { "Fecha": new Date(s.ts).toLocaleDateString("es-AR"), "Hora": hhmm(s.ts), "Tela": s.name, "Cantidad": s.qty, "Unidad": s.unit, "Precio": s.price, "Total": s.total, "Pago": s.method, "Nota": s.note, "Estado": s.voided ? "ANULADA" : "Válida" }; });
    var moves = state.moves.map(function (m) { return { "Fecha": new Date(m.ts).toLocaleDateString("es-AR"), "Hora": hhmm(m.ts), "Tela": m.name, "Tipo": m.type, "Cantidad": m.qty, "Stock resultante": m.stockAfter, "Nota": m.note }; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stock), "Stock");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sales.length ? sales : [{ "Fecha": "" }]), "Ventas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(moves.length ? moves : [{ "Fecha": "" }]), "Movimientos");
    var cierres = [];
    function crow(d, x, estado) { var b = x.byMethod || {}; return { "Fecha": d, "Estado": estado, "Fondo inicial": x.opening, "Ventas efectivo": b.Efectivo || 0, "Transferencia": b.Transferencia || 0, "Débito": b["Débito"] || 0, "Crédito": b["Crédito"] || 0, "Total vendido": x.total, "Retiros y gastos": x.expenses, "Debía haber": x.expected, "Contado": x.counted, "Diferencia": x.diff, "Hora de cierre": hhmm(x.ts) }; }
    Object.keys(state.cash).sort().forEach(function (d) { var c = state.cash[d]; (c.history || []).forEach(function (x) { cierres.push(crow(d, x, "Reabierta")); }); if (c.closed) cierres.push(crow(d, c.closed, "Cerrada")); });
    var retiros = state.expenses.map(function (e) { return { "Fecha": e.day, "Hora": hhmm(e.ts), "Monto": e.amount, "Motivo": e.note }; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cierres.length ? cierres : [{ "Fecha": "" }]), "Cierres de caja");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(retiros.length ? retiros : [{ "Fecha": "" }]), "Retiros y gastos");
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
      body.appendChild(h("p", { class: "closedtag", text: "Caja cerrada a las " + hhmm(x.ts) + " · Total vendido: " + money(x.total) + " en " + x.salesCount + (x.salesCount === 1 ? " venta" : " ventas") }));
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
    state.items.forEach(function (i) { sel.appendChild(h("option", { value: i.id, text: i.name + " · quedan " + fmt(i.stock) + " " + i.unit })); });
    if (prev && itemById(prev)) { sel.value = prev; calc(); } else syncPrice();
  }
  function syncPrice() { var i = itemById($("#s-item").value); $("#s-price").value = i ? String(i.price || "") : ""; calc(); }
  function calc() { $("#s-total").textContent = money(r2(num($("#s-qty").value) * num($("#s-price").value))); }
  $("#s-item").addEventListener("change", syncPrice);
  $("#s-qty").addEventListener("input", calc); $("#s-price").addEventListener("input", calc);
  $("#sale-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    if ($("#s-submit").disabled) return;
    var i = itemById($("#s-item").value), qty = num($("#s-qty").value), price = num($("#s-price").value), msg = $("#s-msg");
    msg.textContent = "";
    if (conflict) { msg.textContent = "Se está recargando la pantalla. Esperá un momento."; return; }
    if (cashOf(dayKey(Date.now())).closed) { msg.textContent = "La caja de hoy está cerrada. Reabrila abajo para seguir vendiendo."; return; }
    if (!i) { msg.textContent = "Elegí una tela."; return; }
    if (qty <= 0) { msg.textContent = "Poné una cantidad mayor a cero."; return; }
    if (price <= 0) { msg.textContent = "Falta el precio. Escribilo acá o en la tabla de stock."; return; }
    if (price > 10000000 || qty * price > 1000000000) { msg.textContent = "El precio o el total parece demasiado alto. Revisá los ceros."; return; }
    if (qty > i.stock) { msg.textContent = "No alcanza el stock: quedan " + fmt(i.stock) + " " + i.unit + "."; return; }
    var sb = $("#s-submit"); sb.disabled = true; setTimeout(function () { sb.disabled = false; }, 1200);
    i.stock = Math.round((i.stock - qty) * 1000) / 1000; if (!i.price) i.price = price;
    var s = { id: uid(), ts: Date.now(), itemId: i.id, name: i.name, unit: i.unit, qty: qty, price: price, total: r2(qty * price), method: $("#s-method").value, note: $("#s-note").value.trim() };
    state.sales.push(s); logMove(i, "venta", -qty, s.note);
    $("#day").value = dayKey(Date.now()); $("#s-qty").value = "1"; $("#s-note").value = ""; renderStock();
    save("Venta guardada: " + money(s.total));
  });
  function renderCaja() {
    if (!$("#day").value) $("#day").value = dayKey(Date.now());
    var day = $("#day").value, list = state.sales.filter(function (s) { return dayKey(s.ts) === day; }).sort(function (a, b) { return b.ts - a.ts; });
    var by = { Efectivo: 0, Transferencia: 0, "Débito": 0, "Crédito": 0 }, total = 0;
    list.forEach(function (s) { if (s.voided) return; by[s.method] = r2((by[s.method] || 0) + s.total); total = r2(total + s.total); });
    var box = $("#stats-caja"); box.textContent = "";
    box.appendChild(h("div", { class: "stat main" }, h("small", { text: "Total del día" }), h("b", { text: money(total) })));
    Object.keys(by).forEach(function (k) { box.appendChild(h("div", { class: "stat" }, h("small", { text: k }), h("b", { text: money(by[k]) }))); });
    renderCierre(day, by);
    var tb = $("#tb-sales"); tb.textContent = "";
    if (!list.length) tb.appendChild(h("tr", null, h("td", { colspan: "3", class: "empty", text: "No hay ventas en este día." })));
    list.forEach(function (s) {
      tb.appendChild(h("tr", null,
        h("td", null, h("div", { class: "t", text: s.name }), h("div", { class: "hint", text: hhmm(s.ts) + " · " + fmt(s.qty) + " " + s.unit + " × " + money(s.price) + " · " + s.method + (s.note ? " · " + s.note : "") })),
        h("td", { class: "num t", text: money(s.total), style: s.voided ? "text-decoration:line-through;color:var(--muted)" : "" }),
        h("td", { class: "actions" }, s.voided ? h("span", { class: "pill", text: "Anulada " + hhmm(s.voided) }) : h("button", { class: "sm ghost danger", text: "Anular", onclick: function (ev) { voidSale(s, ev.currentTarget); } }))));
    });
  }
  var armedSale = null;
  function voidSale(s, btn) {
    if (cashOf(dayKey(s.ts)).closed) { toast("La caja de ese día está cerrada. Reabrila para anular."); return; }
    if (armedSale !== btn) { armedSale = btn; btn.textContent = "¿Seguro?"; setTimeout(function () { if (armedSale === btn) { btn.textContent = "Anular"; armedSale = null; } }, 3000); return; }
    var i = itemById(s.itemId); if (i) { i.stock = Math.round((i.stock + s.qty) * 1000) / 1000; logMove(i, "anulación", s.qty, "Venta anulada"); }
    s.voided = Date.now(); armedSale = null; renderStock(); save("Venta anulada, el stock volvió");
  }
  $("#day").addEventListener("change", renderCaja);

  renderStock(); backupNote();

  return function dispose() {
    disposed = true;
    clearTimeout(saveTimer); clearTimeout(retryTimer); clearTimeout(toastTimer);
    window.removeEventListener("beforeunload", beforeUnload);
  };
};
