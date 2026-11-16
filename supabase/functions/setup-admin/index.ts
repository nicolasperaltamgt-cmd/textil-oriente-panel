// Crea el primer administrador. Solo funciona mientras no exista ninguno y con el código de instalación.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { count } = await admin.from("allowed_users").select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) return json({ error: "El panel ya está configurado" }, 403);

    const { email, password, name, code } = await req.json();
    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Email inválido" }, 400);
    if (typeof password !== "string" || password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    if (typeof code !== "string" || !code) return json({ error: "Falta el código de instalación" }, 400);

    const { data: cfg } = await admin.from("app_config").select("value").eq("key", "setup_code_hash").maybeSingle();
    if (!cfg || (await sha256(code.trim())) !== cfg.value) return json({ error: "Código de instalación incorrecto" }, 403);

    const created = await admin.auth.admin.createUser({ email: email.trim().toLowerCase(), password, email_confirm: true });
    if (created.error || !created.data.user) return json({ error: created.error?.message ?? "No se pudo crear el usuario" }, 400);

    const ins = await admin.from("allowed_users").insert({
      user_id: created.data.user.id,
      role: "admin",
      display_name: typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : "Administrador",
    });
    if (ins.error) {
      await admin.auth.admin.deleteUser(created.data.user.id);
      return json({ error: "No se pudo dar acceso" }, 500);
    }
    await admin.from("app_config").delete().eq("key", "setup_code_hash");
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Error inesperado" }, 500);
  }
});
