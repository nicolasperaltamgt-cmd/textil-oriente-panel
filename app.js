// Textil Oriente: pantalla de acceso, encabezado, usuarios y recuperación. El panel vive en panel.js.
(function () {
  var cfg = window.TEXTIL_CONFIG;
  var app = document.getElementById("app");
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === "class") el.className = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c != null) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }

  var MARK =
    '<svg class="mark" viewBox="0 0 120 62" aria-hidden="true" focusable="false">' +
    '<polygon points="2,60 36,6 66,60" fill="#f2d21b"/>' +
    '<polygon points="30,2 90,2 60,56" fill="#d8333e"/>' +
    '<polygon points="64,56 92,10 120,60" fill="#3a4f7a"/></svg>';
  function markEl(width) {
    var d = document.createElement("div");
    d.innerHTML = MARK;
    var s = d.firstChild;
    s.setAttribute("width", String(width || 72));
    return s;
  }

  /* ---------- llamadas ---------- */
  function codeOf(err) {
    var msg = String((err && err.message) || "");
    if (/CONFLICT/.test(msg)) return "CONFLICT";
    if (/NO_ACCESS/.test(msg)) return "NO_ACCESS";
    if (/JWT|expired|not authenticated|401/i.test(msg) || (err && err.status === 401)) return "SESSION";
    return "";
  }
  async function rpc(name, args) {
    var r = await sb.rpc(name, args || {});
    if (r.error) {
      var e = new Error(r.error.message);
      e.code = codeOf(r.error);
      throw e;
    }
    return r.data;
  }
  async function callFn(name, body) {
    var s = (await sb.auth.getSession()).data.session;
    var res = await fetch(cfg.SUPABASE_URL + "/functions/v1/" + name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + (s ? s.access_token : cfg.SUPABASE_ANON_KEY),
      },
      body: JSON.stringify(body),
    });
    var j = {};
    try { j = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(j.error || "No se pudo completar la acción");
    return j;
  }
  async function saveState(data, expected) {
    try {
      return await rpc("save_state", { p_data: data, p_expected_version: expected });
    } catch (e) {
      if (!e.code && /fetch|network|Failed/i.test(String(e.message))) e.code = "NETWORK";
      throw e;
    }
  }

  /* ---------- estado de pantalla ---------- */
  var profile = null;
  var disposePanel = null;
  var toastTimer;
  function toast(t) {
    var el = document.getElementById("gtoast");
    if (!el) { el = h("div", { id: "gtoast", role: "status", "aria-live": "polite" }); document.body.appendChild(el); }
    el.textContent = t; el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 3200);
  }
  function clearScreen() {
    if (disposePanel) { disposePanel(); disposePanel = null; }
    app.textContent = "";
  }

  /* ---------- acceso ---------- */
  function field(id, label, type, extra) {
    var input = h("input", Object.assign({ id: id, type: type, class: "input" }, extra || {}));
    if (type === "password") {
      // Botón para ver lo que se escribe: evita errores al tipear la contraseña.
      var eye = h("button", { class: "btn sm", type: "button", text: "Ver", "aria-label": "Mostrar u ocultar la contraseña" });
      eye.addEventListener("click", function () {
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        eye.textContent = show ? "Ocultar" : "Ver";
      });
      return { wrap: h("label", { class: "field", for: id }, label, h("div", { class: "pwrow" }, input, eye)), input: input };
    }
    return { wrap: h("label", { class: "field", for: id }, label, input), input: input };
  }

  function authCard(title, hint) {
    return h("div", { class: "card authcard" }, markEl(84), h("h1", { class: "brand", text: "Textil Oriente" }), h("span", { class: "sub", text: "Telas" }),
      title ? h("h2", { class: "authtitle", text: title }) : null, hint ? h("p", { class: "hint", text: hint }) : null);
  }

  function showLogin() {
    clearScreen();
    var email = field("l-email", "Email", "email", { autocomplete: "username", required: "required" });
    var pass = field("l-pass", "Contraseña", "password", { autocomplete: "current-password", required: "required" });
    var msg = h("p", { class: "msg", role: "alert" });
    var btn = h("button", { class: "btn primary big", type: "submit", text: "Entrar" });
    var form = h("form", { class: "form" }, email.wrap, pass.wrap, msg, btn);
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      msg.textContent = ""; btn.disabled = true; btn.textContent = "Entrando…";
      var r = await sb.auth.signInWithPassword({ email: email.input.value.trim(), password: pass.input.value });
      if (r.error) {
        msg.textContent = /invalid/i.test(r.error.message) ? "Email o contraseña incorrectos." : "No se pudo ingresar: " + r.error.message;
        btn.disabled = false; btn.textContent = "Entrar";
        return;
      }
      boot();
    });
    var card = authCard("", "Ingresá con tu email y tu contraseña.");
    card.appendChild(form);
    card.appendChild(h("p", { class: "hint small", text: "¿Olvidaste la contraseña? Pedísela al administrador." }));
    app.appendChild(h("div", { class: "center" }, card));
    email.input.focus();
  }

  function showSetup() {
    clearScreen();
    var code = field("s-code", "Código de instalación", "text", { autocomplete: "off", required: "required" });
    var name = field("s-name", "Tu nombre", "text", { autocomplete: "name", required: "required" });
    var email = field("s-email", "Email", "email", { autocomplete: "username", required: "required" });
    var pass = field("s-pass", "Contraseña (mínimo 8 caracteres)", "password", { autocomplete: "new-password", required: "required", minlength: "8" });
    var msg = h("p", { class: "msg", role: "alert" });
    var btn = h("button", { class: "btn primary big", type: "submit", text: "Crear administrador" });
    var form = h("form", { class: "form" }, code.wrap, name.wrap, email.wrap, pass.wrap, msg, btn);
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      msg.textContent = ""; btn.disabled = true; btn.textContent = "Creando…";
      try {
        await callFn("setup-admin", { code: code.input.value, name: name.input.value, email: email.input.value, password: pass.input.value });
        var r = await sb.auth.signInWithPassword({ email: email.input.value.trim(), password: pass.input.value });
        if (r.error) throw new Error(r.error.message);
        boot();
      } catch (e) {
        msg.textContent = e.message;
        btn.disabled = false; btn.textContent = "Crear administrador";
      }
    });
    var card = authCard("Primer uso", "Creá la cuenta del administrador. Usá el código de instalación que te dieron.");
    card.appendChild(form);
    app.appendChild(h("div", { class: "center" }, card));
  }

  /* ---------- encabezado y rutas ---------- */
  function shell() {
    clearScreen();
    var today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    var links = h("div", { class: "userrow" }, h("span", { class: "uname", text: profile.display_name || "" }));
    links.appendChild(h("a", { class: "btn sm", href: "#/", text: "Panel" }));
    links.appendChild(h("a", { class: "btn sm", href: "#/recuperar", text: "Recuperar datos" }));
    if (profile.role === "admin") links.appendChild(h("a", { class: "btn sm", href: "#/usuarios", text: "Usuarios" }));
    links.appendChild(h("a", { class: "btn sm", href: "guia.html", target: "_blank", rel: "noopener", text: "Cómo se usa" }));
    links.appendChild(h("button", { class: "btn sm", text: "Salir", onclick: async function () { await sb.auth.signOut(); profile = null; showLogin(); } }));
    var header = h("header", { class: "top" },
      markEl(72),
      h("div", { class: "brandbox" }, h("h1", { class: "brand", text: "Textil Oriente" }), h("span", { class: "sub", text: "Telas" })),
      h("div", { class: "right" }, h("span", { class: "today", text: today }), links));
    var main = h("main", { id: "main" });
    app.appendChild(h("div", { class: "page" }, header, main));
    return main;
  }

  async function route() {
    if (!profile) return;
    var main = shell();
    var hash = location.hash || "#/";
    if (hash === "#/usuarios" && profile.role === "admin") return showUsers(main);
    if (hash === "#/recuperar") return showHistory(main);
    return showPanel(main);
  }

  async function showPanel(main) {
    var loading = h("p", { class: "hint", text: "Cargando datos del servidor…" });
    main.appendChild(loading);
    try {
      var st = await rpc("get_state");
      loading.remove();
      var host = h("div", { class: "txPanel" });
      main.appendChild(host);
      disposePanel = window.mountPanel(host, {
        initialData: st.data,
        initialVersion: st.version,
        saveState: saveState,
        onConflict: function () { route(); },
      });
    } catch (e) {
      loading.remove();
      main.appendChild(h("div", { class: "errbox", role: "alert" },
        h("p", { text: e.code === "SESSION" ? "Tu sesión venció. Volvé a ingresar." : "No se pudieron cargar los datos del servidor. No se edita nada hasta que carguen, para no pisar información." }),
        h("button", { class: "btn primary", text: e.code === "SESSION" ? "Ingresar" : "Reintentar", onclick: function () { e.code === "SESSION" ? showLogin() : route(); } })));
    }
  }

  async function showHistory(main) {
    var box = h("div", { class: "narrow" },
      h("h2", { class: "title", text: "Recuperar datos" }),
      h("p", { class: "hint", text: "El sistema guarda un punto de restauración cada 15 minutos mientras se trabaja. Si algo salió mal, volvé a uno anterior. Antes de volver atrás se guarda lo actual, así que no se pierde nada." }));
    var msg = h("p", { class: "msg", role: "alert" });
    var list = h("div", { class: "list" });
    box.appendChild(msg); box.appendChild(list);
    main.appendChild(box);
    try {
      var rows = await rpc("list_history");
      if (!rows.length) list.appendChild(h("p", { class: "hint pad", text: "Todavía no hay puntos de restauración. Se crean solos al empezar a cargar datos." }));
      rows.forEach(function (r) {
        var armed = false;
        var btn = h("button", { class: "btn", text: "Volver a este punto" });
        btn.addEventListener("click", async function () {
          if (!armed) { armed = true; btn.textContent = "¿Confirmás volver a este punto?"; btn.classList.add("primary"); setTimeout(function () { armed = false; btn.textContent = "Volver a este punto"; btn.classList.remove("primary"); }, 4000); return; }
          btn.disabled = true;
          try { await rpc("restore_history", { p_id: r.id }); location.hash = "#/"; toast("Datos restaurados"); route(); }
          catch (e) { msg.textContent = e.message; btn.disabled = false; }
        });
        var d = new Date(r.created_at).toLocaleString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        list.appendChild(h("div", { class: "row" }, h("div", { class: "when" }, h("b", { text: d }), h("span", { text: r.telas + " telas · " + r.ventas + " ventas" })), btn));
      });
    } catch (e) { msg.textContent = "No se pudo cargar el historial."; }
  }

  async function showUsers(main) {
    var box = h("div", { class: "narrow" }, h("h2", { class: "title", text: "Usuarios" }),
      h("p", { class: "hint", text: "Solo el administrador crea usuarios. Anotá la contraseña y pasásela en persona a quien va a usar el panel." }));
    var msg = h("p", { class: "msg", role: "status" });
    var list = h("div", { class: "list" });

    var name = field("u-name", "Nombre", "text", { required: "required", placeholder: "Tomás" });
    var email = field("u-email", "Email", "email", { required: "required", placeholder: "tomas@correo.com", autocomplete: "off" });
    var pass = field("u-pass", "Contraseña (mínimo 8 caracteres)", "text", { required: "required", minlength: "8", autocomplete: "off" });
    var btn = h("button", { class: "btn primary", type: "submit", text: "Crear usuario" });
    var form = h("form", { class: "card form" }, h("h3", { class: "subtitle", text: "Crear usuario" }), name.wrap, email.wrap, pass.wrap, btn);
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault(); btn.disabled = true; msg.className = "msg"; msg.textContent = "";
      try {
        await callFn("manage-users", { action: "create", name: name.input.value, email: email.input.value, password: pass.input.value });
        msg.className = "msg okmsg"; msg.textContent = "Usuario creado. Ya puede ingresar con esa contraseña.";
        form.reset(); await refresh();
      } catch (e) { msg.textContent = e.message; }
      btn.disabled = false;
    });

    async function refresh() {
      list.textContent = "";
      try {
        var res = await callFn("manage-users", { action: "list" });
        res.users.forEach(function (u) {
          var pw = h("input", { class: "input", type: "text", placeholder: "Nueva contraseña", autocomplete: "off", "aria-label": "Nueva contraseña de " + u.display_name });
          var setBtn = h("button", { class: "btn sm", text: "Cambiar contraseña" });
          setBtn.addEventListener("click", async function () {
            if (pw.value.length < 8) { msg.className = "msg"; msg.textContent = "La contraseña nueva necesita al menos 8 caracteres."; return; }
            try { await callFn("manage-users", { action: "set_password", user_id: u.user_id, password: pw.value }); pw.value = ""; msg.className = "msg okmsg"; msg.textContent = "Contraseña cambiada."; }
            catch (e) { msg.className = "msg"; msg.textContent = e.message; }
          });
          var armed = false;
          var rm = h("button", { class: "btn sm danger", text: "Quitar" });
          rm.addEventListener("click", async function () {
            if (!armed) { armed = true; rm.textContent = "¿Seguro?"; setTimeout(function () { armed = false; rm.textContent = "Quitar"; }, 3000); return; }
            try { await callFn("manage-users", { action: "remove", user_id: u.user_id }); await refresh(); }
            catch (e) { msg.className = "msg"; msg.textContent = e.message; }
          });
          list.appendChild(h("div", { class: "row wrap" },
            h("div", { class: "when" }, h("b", { text: u.display_name }), h("span", { text: u.email + " · " + (u.role === "admin" ? "administrador" : "usuario") })),
            h("div", { class: "rowtools" }, pw, setBtn, rm)));
        });
      } catch (e) { msg.className = "msg"; msg.textContent = e.message; }
    }
    box.appendChild(msg); box.appendChild(list); box.appendChild(form);
    main.appendChild(box);
    refresh();
  }

  /* ---------- arranque ---------- */
  async function boot() {
    clearScreen();
    app.appendChild(h("div", { class: "center" }, h("p", { class: "hint", text: "Cargando…" })));
    try {
      var session = (await sb.auth.getSession()).data.session;
      if (!session) {
        var needs = await sb.rpc("needs_setup");
        if (needs.data === true) return showSetup();
        return showLogin();
      }
      profile = await rpc("my_profile");
      if (!profile) {
        clearScreen();
        var card = authCard("Sin acceso", "Tu usuario todavía no tiene permiso para usar el panel. Pedile acceso al administrador.");
        card.appendChild(h("button", { class: "btn", text: "Salir", onclick: async function () { await sb.auth.signOut(); showLogin(); } }));
        app.appendChild(h("div", { class: "center" }, card));
        return;
      }
      route();
    } catch (e) {
      clearScreen();
      var c = authCard("No se pudo conectar", "Revisá la conexión a internet y volvé a intentar.");
      c.appendChild(h("button", { class: "btn primary", text: "Reintentar", onclick: boot }));
      app.appendChild(h("div", { class: "center" }, c));
    }
  }

  window.addEventListener("hashchange", route);
  sb.auth.onAuthStateChange(function (event) {
    if (event === "SIGNED_OUT" && profile) { profile = null; showLogin(); }
  });
  boot();
})();
