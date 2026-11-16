// Estructura del panel de stock y caja (la lógica vive en helpers/panelApp).
export const panelHtml = `
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

