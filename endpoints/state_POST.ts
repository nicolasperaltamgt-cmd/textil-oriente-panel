import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../helpers/getSetServerSession";
import type { Json } from "../helpers/schema";
import superjson from "superjson";
import { schema, OutputType } from "./state_POST.schema";

const SNAPSHOT_EVERY_MS = 15 * 60 * 1000;

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const body = schema.parse(superjson.parse(await request.text()));
    const data = body.data as unknown as Json;

    const version = await db.transaction().execute(async (trx) => {
      let newVersion: number;
      if (body.expectedVersion === 0) {
        const inserted = await trx
          .insertInto("appState")
          .values({ id: 1, data, version: 1, updatedBy: user.id })
          .onConflict((oc) => oc.column("id").doNothing())
          .returning("version")
          .executeTakeFirst();
        if (!inserted) return null;
        newVersion = inserted.version;
      } else {
        const updated = await trx
          .updateTable("appState")
          .set({
            data,
            version: body.expectedVersion + 1,
            updatedBy: user.id,
            updatedAt: new Date(),
          })
          .where("id", "=", 1)
          .where("version", "=", body.expectedVersion)
          .returning("version")
          .executeTakeFirst();
        if (!updated) return null;
        newVersion = updated.version;
      }

      // Restore point at most once an hour.
      const last = await trx
        .selectFrom("appStateHistory")
        .select("createdAt")
        .orderBy("createdAt", "desc")
        .limit(1)
        .executeTakeFirst();
      if (!last || Date.now() - new Date(last.createdAt).getTime() > SNAPSHOT_EVERY_MS) {
        await trx
          .insertInto("appStateHistory")
          .values({ version: newVersion, data, createdBy: user.id })
          .execute();
      }
      return newVersion;
    });

    if (version === null) {
      return new Response(
        superjson.stringify({ error: "Otra persona cambió los datos mientras trabajabas. Se recarga la pantalla." }),
        { status: 409 }
      );
    }
    return new Response(superjson.stringify({ version } satisfies OutputType));
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Tenés que iniciar sesión" }), { status: 401 });
    }
    console.error("state POST error:", error);
    return new Response(
      superjson.stringify({ error: error instanceof Error ? error.message : "No se pudo guardar" }),
      { status: 400 }
    );
  }
}
