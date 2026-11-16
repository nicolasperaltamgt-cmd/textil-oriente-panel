# Textil Oriente: panel de stock y caja

Panel para el local de telas Textil Oriente (Argerich, Buenos Aires). Reemplaza el cuaderno y el Excel.

En producción: https://textil-oriente.floot.app (hosting, base de datos y login de Floot).

## Qué hace

- Stock de telas editable: nombre, unidad (kg, m, u), stock, precio, mínimo para reponer y valor en stock.
- Carga de stock pegando una lista de texto ("Morley est 494") o subiendo un Excel. Descarga a Excel.
- Caja: ventas por forma de pago (efectivo, transferencia, débito, crédito) que descuentan stock. Las ventas se anulan sin borrarse.
- Cierre de caja: fondo inicial, retiros y gastos, efectivo contado y diferencia. El día cerrado bloquea ventas y anulaciones hasta reabrirlo.
- Todo se guarda en el servidor con control de versión (si dos dispositivos editan a la vez, se avisa y se recarga). Punto de restauración cada 15 minutos y pantalla "Recuperar datos".
- Copia de seguridad descargable (JSON y Excel).
- Login cerrado: el registro público devuelve 403. El administrador crea usuarios en `/usuarios`.

## Estructura

Este repositorio contiene solo el código propio del proyecto de Floot. Los componentes de interfaz genéricos, el login y los helpers de plantilla (Button, Input, Form, ProtectedRoute, useAuth, etc.) los genera Floot al crear el proyecto y al provisionar el recurso `auth`.

- `helpers/panelApp.tsx`: lógica del panel (stock, caja, cierre, Excel, guardado con versión).
- `helpers/panelHtml.tsx`, `helpers/panelCss.tsx`: estructura y estilos del panel.
- `components/StockPanel.tsx`: carga el estado del servidor y monta el panel.
- `endpoints/state_GET.ts`, `endpoints/state_POST.ts`: lectura y guardado con control de versión (409 en conflicto).
- `endpoints/state/history_GET.ts`, `endpoints/state/restore_POST.ts`: puntos de restauración.
- `endpoints/users/create_POST.ts`: alta de usuarios (solo administrador).
- `endpoints/auth/register_with_password_POST.ts`: registro cerrado.
- `pages/`: `_index` (panel), `login`, `usuarios`, `recuperar`.
- `sql/schema.sql`: tablas propias.

Dependencia agregada: `xlsx@0.18.5`.

## Datos y seguridad

- No hay claves ni secretos en el código. `JWT_SECRET` y la URL de la base los inyecta Floot.
- Los datos reales del negocio viven en la base de Floot y no se versionan aquí.
