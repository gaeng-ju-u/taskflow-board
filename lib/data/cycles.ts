import "server-only";

import { cache } from "react";

import { listCycles } from "@/lib/api/cycles";
import { createClient } from "@/lib/supabase/server";

export const getCycles = cache(async (projectId: string) =>
  listCycles(await createClient(), projectId),
);
