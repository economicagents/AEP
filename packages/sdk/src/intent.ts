/**
 * Intent specification format for the intent resolution engine.
 * Structured JSON schema for expressing economic intents.
 */

import { z } from "zod";

/** Quality/constraint bounds */
export const IntentConstraintsSchema = z.object({
  latency_ms: z.number().positive().optional(),
  accuracy: z.number().min(0).max(1).optional(),
});

/** Budget bounds */
export const IntentBudgetSchema = z.object({
  max_per_unit: z.string(),
  max_total: z.string(),
  currency: z.enum(["USDC"]).optional().default("USDC"),
});

/** Trust requirements */
export const IntentTrustSchema = z.object({
  min_reputation: z.number().min(0).max(1).optional(),
  required_validation: z
    .enum(["optimistic", "zk", "tee", "any"])
    .optional()
    .default("any"),
});

/** Preferences */
export const IntentPreferencesSchema = z.object({
  prefer_chain: z.string().optional(),
  prefer_settlement: z.enum(["immediate", "deferred"]).optional(),
});

/** Full intent schema */
export const IntentSchema = z.object({
  capability: z.string().min(1),
  constraints: IntentConstraintsSchema.optional(),
  budget: IntentBudgetSchema,
  trust: IntentTrustSchema.optional(),
  preferences: IntentPreferencesSchema.optional(),
});

export type IntentConstraints = z.infer<typeof IntentConstraintsSchema>;
export type IntentBudget = z.infer<typeof IntentBudgetSchema>;
export type IntentTrust = z.infer<typeof IntentTrustSchema>;
export type IntentPreferences = z.infer<typeof IntentPreferencesSchema>;
export type Intent = z.infer<typeof IntentSchema>;

/** Parse and validate intent from unknown input */
export function parseIntent(input: unknown): Intent {
  return IntentSchema.parse(input);
}
