import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../helpers/getSetServerSession";
import superjson from "superjson";
import type { OutputType } from "./state_GET.schema";

export async function handle(request: Request) {
  try {
    await getServerUserSession(request);
    const row = await db
      .selectFrom("appState")
      .select(["data", "version"])
      .where("id", "=", 1)
      .executeTakeFirst();
    return new Response(
      superjson.stringify({
        data: row ? row.data : null,
        version: row ? row.version : 0,
      } satisfies OutputType)
    );
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Tenés que iniciar sesión" }), { status: 401 });
    }
    console.error("state GET error:", error);
    return new Response(superjson.stringify({ error: "No se pudieron cargar los datos" }), { status: 500 });
  }
}
