import superjson from "superjson";

export type HistoryItem = {
  id: number;
  version: number;
  createdAt: Date;
  telas: number;
  ventas: number;
};

export type OutputType = { items: HistoryItem[] };

export const getStateHistory = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/state/history`, { method: "GET", ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
