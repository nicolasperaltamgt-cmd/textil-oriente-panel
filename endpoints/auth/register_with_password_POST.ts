import superjson from "superjson";

// El registro público está cerrado: la caja es privada.
// Los usuarios los crea el administrador desde el panel (endpoints/users/create).
export async function handle(_request: Request) {
  return new Response(
    superjson.stringify({ message: "El registro está cerrado. Pedile un usuario al administrador." }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

