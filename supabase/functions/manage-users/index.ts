// Gestión de usuarios: solo para administradores (requiere sesión iniciada).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: who } = await caller.auth.getUser();
    if (!who.user) return json({ error: "Tenés que iniciar sesión" }, 401);
    const me = await admin.from("allowed_users").select("role").eq("user_id", who.user.id).maybeSingle();
    if (me.data?.role !== "admin") return json({ error: "Solo el administrador puede hacer esto" }, 403);

    const body = await req.json();
    const action = body.action;
    const ROLES = ["admin", "user", "viewer"];

    if (action === "list") {
      const rows = await admin.from("allowed_users").select("user_id, role, display_name, created_at").order("created_at");
      const users = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const emails = new Map((users.data?.users ?? []).map((u) => [u.id, u.email]));
      return json({ users: (rows.data ?? []).map((r) => ({ ...r, email: emails.get(r.user_id) ?? "" })) });
    }

    if (action === "create") {
      const { email, password, name } = body;
      const role = ROLES.includes(body.role) ? body.role : "user";
      // El rol de solo lectura puede usar una clave corta (mínimo 6); los demás, 8.
      const minLen = role === "viewer" ? 6 : 8;
      if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Email inválido" }, 400);
      if (typeof password !== "string" || password.length < minLen) return json({ error: "La contraseña debe tener al menos " + minLen + " caracteres" }, 400);
      if (typeof name !== "string" || !name.trim()) return json({ error: "Poné un nombre" }, 400);
      const created = await admin.auth.admin.createUser({ email: email.trim().toLowerCase(), password, email_confirm: true });
      if (created.error || !created.data.user) return json({ error: created.error?.message ?? "No se pudo crear el usuario" }, 400);
      const ins = await admin.from("allowed_users").insert({
        user_id: created.data.user.id,
        role,
        display_name: name.trim().slice(0, 80),
      });
      if (ins.error) {
        await admin.auth.admin.deleteUser(created.data.user.id);
        return json({ error: "No se pudo dar acceso" }, 500);
      }
      return json({ ok: true });
    }

    if (action === "set_password") {
      const { user_id, password } = body;
      if (typeof user_id !== "string" || typeof password !== "string" || password.length < 6) return json({ error: "Datos inválidos (mínimo 6 caracteres)" }, 400);
      const target = await admin.from("allowed_users").select("user_id, role").eq("user_id", user_id).maybeSingle();
      if (!target.data) return json({ error: "Usuario no encontrado" }, 404);
      if (target.data.role !== "viewer" && password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      const upd = await admin.auth.admin.updateUserById(user_id, { password });
      if (upd.error) return json({ error: upd.error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_role") {
      const { user_id, role } = body;
      if (typeof user_id !== "string" || !ROLES.includes(role)) return json({ error: "Datos inválidos" }, 400);
      if (user_id === who.user.id) return json({ error: "No podés cambiar tu propio rol" }, 400);
      const upd = await admin.from("allowed_users").update({ role }).eq("user_id", user_id);
      if (upd.error) return json({ error: "No se pudo cambiar el rol" }, 500);
      return json({ ok: true });
    }

    if (action === "remove") {
      const { user_id } = body;
      if (typeof user_id !== "string") return json({ error: "Datos inválidos" }, 400);
      if (user_id === who.user.id) return json({ error: "No podés borrarte a vos mismo" }, 400);
      const del = await admin.auth.admin.deleteUser(user_id);
      if (del.error) return json({ error: del.error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Error inesperado" }, 500);
  }
});
