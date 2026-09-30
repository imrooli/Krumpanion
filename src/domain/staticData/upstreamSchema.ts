import { z } from "zod";

export const provenanceSchema = z.object({ provider: z.string().min(1), revision: z.string().min(1), table: z.string().min(1), relationshipIds: z.array(z.number().int().positive()).optional() });
export const gameIdentitySchema = z.object({ gameId: z.number().int().positive().optional(), aliases: z.array(z.string().min(1)).optional(), provenance: provenanceSchema.optional(), manualFields: z.array(z.enum(["displayName", "rarity", "weaponType", "element"])).optional() });
const stepSchema = z.object({ costs: z.record(z.number().int().nonnegative()), requiredAscension: z.number().int().min(0).max(6).optional() });
export const exactCharacterSchema = z.object({ manual: z.boolean().optional(), ascension: z.record(stepSchema), talents: z.object({ normal: z.record(stepSchema), skill: z.record(stepSchema), burst: z.record(stepSchema) }), provenance: provenanceSchema });
export const exactWeaponSchema = z.object({ manual: z.boolean().optional(), ascension: z.record(stepSchema), provenance: provenanceSchema });
export const artifactSetIdentitySchema = gameIdentitySchema.extend({ key: z.string().min(1), displayName: z.string().min(1), memberGameIds: z.array(z.number().int().positive()).optional() });

const entityTypeSchema = z.enum(["character", "weapon", "material", "artifactSet"]);
export const diagnosticSchema = z.object({ entityType: entityTypeSchema.optional(), gameId: z.number().optional(), message: z.string(), code: z.string().optional(), dataset: z.string().optional(), field: z.string().optional(), recordId: z.string().optional(), severity: z.enum(["info", "warning", "error"]).optional(), stage: z.string().optional() });
export const farmingOriginSchema = z.object({ source: z.enum(["manual", "upstream"]), provenance: provenanceSchema.optional(), domainGameId: z.number().int().positive().optional() });
const metricsSchema = z.object({ bytes: z.number(), fetched: z.number(), reused: z.number(), parseMs: z.number(), downloadMs: z.number() });
const syncAttemptSchema = z.object({ trigger: z.enum(["startup", "manual", "good", "bundle"]), startedAt: z.string(), finishedAt: z.string().optional(), durationMs: z.number().optional(), previousRevision: z.string().optional(), checkedRevision: z.string().optional(), result: z.enum(["running", "updated", "current", "failed", "interrupted"]), stage: z.string(), revisionBytes: z.number().optional(), metrics: metricsSchema.optional(), recordsObserved: z.number().optional(), farmingAccepted: z.number().optional(), farmingRejected: z.number().optional(), delta: z.object({ added: z.number(), changed: z.number(), unchanged: z.number(), review: z.number(), progression: z.number(), families: z.number(), domains: z.number(), schedules: z.number(), affectedKeys: z.array(z.string()) }).optional(), reconcileMs: z.number().optional(), validationMs: z.number().optional(), persistenceMs: z.number().optional() });
export const updateStateSchema = z.object({
  appliedExtractorVersion: z.number().int().nonnegative().optional(),
  lastAttempt: syncAttemptSchema.optional(),
  lastSuccessfulAttempt: syncAttemptSchema.optional(),
  lastDelta: z.object({ added: z.number(), changed: z.number(), unchanged: z.number(), review: z.number(), progression: z.number(), families: z.number(), domains: z.number(), schedules: z.number(), affectedKeys: z.array(z.string()) }).optional(),
  provider: z.string(), checkedRevision: z.string().optional(), appliedRevision: z.string().optional(), releaseVersion: z.string().optional(),
  lastChecked: z.string().datetime().optional(), lastSynchronized: z.string().datetime().optional(), retryAfter: z.string().datetime().optional(), effectiveVersion: z.number().int().nonnegative(),
  status: z.enum(["idle", "checking", "downloading", "updated", "current", "failed"]), error: z.string().optional(),
  discoveries: z.record(z.object({ id: z.string(), entityType: entityTypeSchema, rawKey: z.string(), candidateGameId: z.number().int().positive().optional(), candidateKey: z.string().optional(), accountIds: z.array(z.string()), firstSeen: z.string().datetime(), lastSeen: z.string().datetime(), source: z.literal("GOOD"), status: z.enum(["detected", "checking_upstream", "resolved", "needs_review", "ignored"]), notes: z.string().optional() })),
  diagnostics: z.array(diagnosticSchema),
  lastSummary: z.record(entityTypeSchema, z.number().int().nonnegative()).optional(),
});
