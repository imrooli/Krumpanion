import type { MaterialTotals } from "../../utils/collections";
import type { CharacterElement, CharacterWeaponType, WeaponRarity } from "./types";

export type EntityType = "character" | "weapon" | "material" | "artifactSet";
export type CombatTalent = "normal" | "skill" | "burst";
export interface DataProvenance {
  provider: string;
  revision: string;
  table: string;
  relationshipIds?: number[];
}
export interface GameIdentity {
  gameId?: number;
  aliases?: string[];
  provenance?: DataProvenance;
  manualFields?: Array<"displayName" | "rarity" | "weaponType" | "element">;
}
export interface ArtifactSetIdentity extends GameIdentity {
  key: string;
  displayName: string;
  memberGameIds?: number[];
}
export interface ProgressionStep {
  costs: MaterialTotals;
  requiredAscension?: number;
}
export interface ExactCharacterRequirements {
  manual?: boolean;
  ascension: Record<string, ProgressionStep>;
  talents: Record<CombatTalent, Record<string, ProgressionStep>>;
  provenance: DataProvenance;
}
export interface ExactWeaponRequirements {
  manual?: boolean;
  ascension: Record<string, ProgressionStep>;
  provenance: DataProvenance;
}
export interface GameDataObservation {
  entityType: EntityType;
  gameId: number;
  displayName: string;
  canonicalKey?: string;
  aliases?: string[];
  rarity?: WeaponRarity;
  weaponType?: CharacterWeaponType;
  element?: CharacterElement;
  memberGameIds?: number[];
  // Before reconciliation, cost keys are upstream material IDs, never names.
  characterRequirements?: ExactCharacterRequirements;
  weaponRequirements?: ExactWeaponRequirements;
  provenance: DataProvenance;
}
export interface UpstreamDiagnostic {
  code?: string;
  dataset?: string;
  field?: string;
  recordId?: string;
  severity?: "info" | "warning" | "error";
  stage?: string;
  entityType?: EntityType;
  gameId?: number;
  message: string;
}
export interface GameDataProviderResult {
  extractorVersion?: number;
  farming?: FarmingObservation[];
  metrics?: DatasetMetrics;
  provider: string;
  revision: string;
  releaseVersion?: string;
  observations: GameDataObservation[];
  diagnostics: UpstreamDiagnostic[];
}
export interface GameDataRevision {
  bytes?: number;
  revision: string;
  releaseVersion?: string;
}
export interface GameDataProvider {
  readonly extractorVersion?: number;
  readonly id: string;
  checkForUpdate(signal?: AbortSignal): Promise<GameDataRevision>;
  fetchLiveData(revision: GameDataRevision, signal?: AbortSignal): Promise<GameDataProviderResult>;
}
export class GameDataProviderError extends Error {
  constructor(message: string, public retryAfterMs?: number, public diagnostics?: UpstreamDiagnostic[]) { super(message); this.name = "GameDataProviderError"; }
}
export interface FarmingObservation {
  kind: "talent" | "weapon";
  materialIds: number[];
  recipeIds: number[];
  recipeCoins: number[];
  stageIds?: number[];
  rewardPreviewIds?: number[];
  domain?: { gameId: number; name: string; resinCost?: number };
  provenance: DataProvenance;
}
export type FarmingField = "family" | "source" | "availability" | "resinCost";
export interface FarmingFieldOrigin { source: "manual" | "upstream"; provenance?: DataProvenance; domainGameId?: number }
export interface FarmingConflict {
  id: string; materialKey: string; field: FarmingField;
  proposed: import("./farmingConfiguration").FarmingConfiguration;
  provenance: DataProvenance;
  domainGameId?: number;
  status: "pending" | "kept_manual" | "accepted";
}
export interface DatasetMetrics { bytes: number; fetched: number; reused: number; parseMs: number; downloadMs: number }
export interface UpdateDelta {
  added: number; changed: number; unchanged: number; review: number;
  progression: number; families: number; domains: number; schedules: number;
  affectedKeys: string[];
}
export interface SyncAttempt {
  trigger: "startup" | "manual" | "good" | "bundle";
  startedAt: string; finishedAt?: string; durationMs?: number;
  previousRevision?: string; checkedRevision?: string;
  result: "running" | "updated" | "current" | "failed" | "interrupted";
  stage: string; revisionBytes?: number; metrics?: DatasetMetrics;
  recordsObserved?: number; farmingAccepted?: number; farmingRejected?: number; delta?: UpdateDelta;
  reconcileMs?: number; validationMs?: number; persistenceMs?: number;
}
export interface GameDataDiscovery {
  id: string;
  entityType: EntityType;
  rawKey: string;
  candidateGameId?: number;
  candidateKey?: string;
  accountIds: string[];
  firstSeen: string;
  lastSeen: string;
  source: "GOOD";
  status: "detected" | "checking_upstream" | "resolved" | "needs_review" | "ignored";
  notes?: string;
}
export interface GameDataUpdateState {
  appliedExtractorVersion?: number;
  lastAttempt?: SyncAttempt;
  lastSuccessfulAttempt?: SyncAttempt;
  lastDelta?: UpdateDelta;
  provider: string;
  checkedRevision?: string;
  appliedRevision?: string;
  releaseVersion?: string;
  lastChecked?: string;
  lastSynchronized?: string;
  retryAfter?: string;
  effectiveVersion: number;
  status: "idle" | "checking" | "downloading" | "updated" | "current" | "failed";
  error?: string;
  discoveries: Record<string, GameDataDiscovery>;
  diagnostics: UpstreamDiagnostic[];
  lastSummary?: Partial<Record<EntityType, number>>;
}
export function createGameDataUpdateState(): GameDataUpdateState {
  return { provider: "animegamedata2", effectiveVersion: 0, status: "idle", discoveries: {}, diagnostics: [] };
}
