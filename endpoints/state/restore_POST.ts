import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import superjson from "superjson";
import { schema, OutputType } from "./restore_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const { id } = schema.parse(superjson.parse(await request.text()));

    const version = await db.transaction().execute(async (trx) => {
      const snapshot = await trx
        .selectFrom("appStateHistory")
        .select(["data"])
        .where("id", "=", id)
        .executeTakeFirst();
      if (!snapshot) throw new Error("Ese punto de restauración ya no existe");

      const current = await trx
        .selectFrom("appState")
        .select(["data", "version"])
        .where("id", "=", 1)
        .forUpdate()
        .executeTakeFirst();

      // Antes de volver atrás se guarda lo actual: nada se pierde.
      if (current) {
        await trx
          .insertInto("appStateHistory")
          .values({ version: current.version, data: current.data, createdBy: user.id })
          .execute();
        const updated = await trx
          .updateTable("appState")
          .set({ data: snapshot.data, version: current.version + 1, updatedBy: user.id, updatedAt: new Date() })
          .where("id", "=", 1)
          .returning("version")
          .executeTakeFirstOrThrow();
        return updated.version;
      }
      const inserted = await trx
        .insertInto("appState")
        .values({ id: 1, data: snapshot.data, version: 1, updatedBy: user.id })
        .returning("version")
        .executeTakeFirstOrThrow();
      return inserted.version;
    });

    return new Response(superjson.stringify({ version } satisfies OutputType));
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Tenés que iniciar sesión" }), { status: 401 });
    }
    console.error("restore POST error:", error);
    return new Response(
      superjson.stringify({ error: error instanceof Error ? error.message : "No se pudo restaurar" }),
      { status: 400 }
    );
  }
}
