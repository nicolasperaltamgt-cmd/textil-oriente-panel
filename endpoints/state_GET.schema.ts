import superjson from "superjson";

export type OutputType = {
  data: unknown | null;
  version: number;
};

export const getState = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/state`, {
    method: "GET",
    ...init,
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
