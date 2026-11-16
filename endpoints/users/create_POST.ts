import { db } from "../../helpers/db";
import { sql } from "kysely";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import { generatePasswordHash } from "../../helpers/generatePasswordHash";
import superjson from "superjson";
import { schema, OutputType } from "./create_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    if (user.role !== "admin") {
      return new Response(superjson.stringify({ error: "Solo el administrador puede crear usuarios" }), { status: 403 });
    }
    const { email: rawEmail, displayName, password } = schema.parse(superjson.parse(await request.text()));
    const email = rawEmail.trim().toLowerCase();

    const existing = await db
      .selectFrom("users")
      .select("id")
      .where(sql`LOWER(email)`, "=", email)
      .limit(1)
      .execute();
    if (existing.length > 0) {
      return new Response(superjson.stringify({ error: "Ese email ya tiene usuario" }), { status: 409 });
    }

    const passwordHash = await generatePasswordHash(password);
    await db.transaction().execute(async (trx) => {
      const created = await trx
        .insertInto("users")
        .values({ email, displayName, role: "user" })
        .returning("id")
        .executeTakeFirstOrThrow();
      await trx.insertInto("userPasswords").values({ userId: created.id, passwordHash }).execute();
    });
    return new Response(superjson.stringify({ ok: true, email } satisfies OutputType));
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Tenés que iniciar sesión" }), { status: 401 });
    }
    console.error("create user error:", error);
    return new Response(
      superjson.stringify({ error: error instanceof Error ? error.message : "No se pudo crear el usuario" }),
      { status: 400 }
    );
  }
}
