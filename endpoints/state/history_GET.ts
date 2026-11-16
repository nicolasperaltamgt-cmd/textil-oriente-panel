import { db } from "../../helpers/db";
import { sql } from "kysely";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import superjson from "superjson";
import type { OutputType } from "./history_GET.schema";

export async function handle(request: Request) {
  try {
    await getServerUserSession(request);
    const rows = await db
      .selectFrom("appStateHistory")
      .select([
        "id",
        "version",
        "createdAt",
        sql<number>`jsonb_array_length(data->'items')`.as("telas"),
        sql<number>`jsonb_array_length(data->'sales')`.as("ventas"),
      ])
      .orderBy("createdAt", "desc")
      .limit(80)
      .execute();
    return new Response(
      superjson.stringify({
        items: rows.map((r) => ({
          id: r.id,
          version: r.version,
          createdAt: new Date(r.createdAt),
          telas: Number(r.telas),
          ventas: Number(r.ventas),
        })),
      } satisfies OutputType)
    );
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Tenés que iniciar sesión" }), { status: 401 });
    }
    console.error("history GET error:", error);
    return new Response(superjson.stringify({ error: "No se pudo cargar el historial" }), { status: 500 });
  }
}
