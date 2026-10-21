import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";

import { emailSchema } from "./auth";

export const workspaceRoleSchema = z.enum(
  Constants.public.Enums.workspace_role,
);

export const createInvitationSchema = z.object({
  email: emailSchema,
  role: workspaceRoleSchema,
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
