import "server-only";

import { cache } from "react";

import { listLabels } from "@/lib/api/labels";
import { createClient } from "@/lib/supabase/server";

export const getLabels = cache(async (workspaceId: string) =>
  listLabels(await createClient(), workspaceId),
);
