# Textil Oriente: panel de stock y caja

Panel para el local de telas Textil Oriente (Argerich, Buenos Aires). Reemplaza el cuaderno y el Excel.

- Panel: https://nicolasperaltamgt-cmd.github.io/textil-oriente-panel/
- Guía para el usuario (paso a paso): https://nicolasperaltamgt-cmd.github.io/textil-oriente-panel/guia.html

No depende de Floot. Son archivos estáticos (GitHub Pages) más una base de datos en Supabase.

## Qué hace

- Stock de telas editable: nombre, unidad (kg, m, u), stock, precio, mínimo para reponer y valor en stock.
- Carga de stock pegando una lista de texto ("Morley est 494") o subiendo un Excel. Descarga a Excel.
- Caja: ventas por forma de pago (efectivo, transferencia, débito, crédito) que descuentan stock. Las ventas se anulan sin borrarse.
- Cierre de caja: fondo inicial, retiros y gastos, efectivo contado y diferencia. El día cerrado bloquea ventas y anulaciones hasta reabrirlo.
- Guardado en el servidor con control de versión: si dos dispositivos editan a la vez, se avisa y se actualiza. Punto de restauración cada 15 minutos y pantalla "Recuperar datos".
- Copia de seguridad descargable (JSON y Excel).
- Acceso solo para usuarios autorizados. El administrador crea usuarios desde la pantalla "Usuarios".

## Estructura

- `index.html`, `style.css`, `app.js`: acceso, encabezado, usuarios y recuperación.
- `panel.js`: lógica del panel (stock, caja, cierre, Excel, guardado).
- `config.js`: URL del proyecto de Supabase y clave `anon` (pública por diseño).
- `guia.html`: guía paso a paso para quien usa el panel.
- `supabase/schema.sql`: tablas y funciones (todo el acceso a los datos pasa por funciones; las tablas no tienen acceso directo).
- `supabase/functions/setup-admin`: crea el primer administrador (requiere código de instalación de un solo uso).
- `supabase/functions/manage-users`: alta, cambio de contraseña y baja de usuarios (solo administrador).

La versión anterior, hecha para Floot, quedó en la etiqueta `floot-version`.

## Seguridad

- Las tablas tienen RLS activado y sin políticas: nadie las lee ni escribe directamente desde el navegador.
- Las funciones comprueban que el usuario esté en `allowed_users`. Quien se registre sin estar autorizado no ve ningún dato.
- La clave `service_role` solo la usan las funciones de servidor y nunca está en este repositorio.
- Los datos del negocio viven en Supabase, no en este repositorio.

## Puesta en marcha desde cero

1. Crear un proyecto de Supabase y ejecutar `supabase/schema.sql`.
2. Desplegar las dos funciones de `supabase/functions` (`setup-admin` sin verificación de JWT, `manage-users` con verificación).
3. Guardar en `app_config` la clave `setup_code_hash` con el SHA-256 de un código de instalación.
4. Poner la URL y la clave `anon` en `config.js` y publicar los archivos (GitHub Pages).
5. Abrir el panel, usar el código de instalación y crear el administrador.

## Copias de seguridad

El proyecto gratis de Supabase se pausa si pasa una semana sin usarse (los datos se conservan). Con uso diario no ocurre. Conviene bajar de vez en cuando la copia desde el botón "Guardar todo".
