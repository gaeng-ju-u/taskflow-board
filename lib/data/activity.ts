import "server-only";

import { cache } from "react";

import { listActivities, listComments } from "@/lib/api/activity";
import { createClient } from "@/lib/supabase/server";

export const getComments = cache(async (issueId: string) =>
  listComments(await createClient(), issueId),
);

export const getActivities = cache(async (issueId: string) =>
  listActivities(await createClient(), issueId),
);
