export interface GoodCharacter {
  key: string;
  level: number;
  constellation: number;
  ascension: number;
  talent: {
    auto: number;
    skill: number;
    burst: number;
  };
}

export interface GoodWeapon {
  key: string;
  level: number;
  ascension: number;
  refinement: number;
  location?: string;
  lock?: boolean;
}

export interface GoodArtifactSubstat {
  key: string;
  value: number;
  initialValue?: number;
}

export interface GoodArtifact {
  setKey: string;
  slotKey: "flower" | "plume" | "sands" | "goblet" | "circlet";
  level: number;
  rarity: number;
  mainStatKey: string;
  location: string;
  lock: boolean;
  substats: GoodArtifactSubstat[];
  astralMark?: boolean;
  elixerCrafted?: boolean;
  totalRolls?: number;
  unactivatedSubstats?: GoodArtifactSubstat[];
}

export interface GoodImport {
  format: string;
  version: number;
  source?: string;
  characters: GoodCharacter[];
  artifacts?: GoodArtifact[];
  weapons?: GoodWeapon[];
  materials?: Record<string, number>;
}

export interface ImportWarning {
  type:
    | "duplicate_character"
    | "duplicate_weapon_id"
    | "duplicate_artifact_id"
    | "unknown_weapon"
    | "unknown_character"
    | "unknown_material";
  message: string;
  key?: string;
}

export interface NormalizedGoodWeapon extends GoodWeapon {
  id: string;
}

export interface UnmatchedNormalizedGoodWeapon extends NormalizedGoodWeapon {
  importName: string;
}

export interface NormalizedGoodArtifact extends GoodArtifact {
  id: string;
}

export interface NormalizedGoodInventory {
  importMeta: {
    format: string;
    version: number;
    source?: string;
    importedAt: string;
  };
  charactersByKey: Record<string, GoodCharacter>;
  weaponsById: Record<string, NormalizedGoodWeapon>;
  artifactsById: Record<string, NormalizedGoodArtifact>;
  materialsByKey: Record<string, number>;
  warnings: ImportWarning[];
}

export interface ImportResult {
  inventory: NormalizedGoodInventory | null;
  warnings: ImportWarning[];
  errors: string[];
}
