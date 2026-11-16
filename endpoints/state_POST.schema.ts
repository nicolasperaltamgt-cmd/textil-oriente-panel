import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  data: z
    .object({
      items: z.array(z.any()).max(5000),
      sales: z.array(z.any()).max(500000),
      moves: z.array(z.any()).max(1000000),
      expenses: z.array(z.any()).max(100000),
      cash: z.record(z.string(), z.any()),
    })
    .passthrough(),
  expectedVersion: z.number().int().min(0),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  version: number;
};

export class StateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateConflictError";
  }
}

export const postState = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/state`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    if (result.status === 409) throw new StateConflictError(errorObject.error);
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
