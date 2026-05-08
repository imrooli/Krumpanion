import type {
  MaterialDescriptor,
  MaterialSourceRecord,
  StaticGameData,
  WeeklyBossMaterial,
} from "./types";
import {
  TROUNCE_DOMAINS,
  WEEKLY_TALENT_MATERIAL_TO_TROUNCE_DOMAIN_KEY,
} from "./plannerResinRegistry";

type WeeklyBossSeed = [
  displayName: string,
  bossKey: string | null,
  bossName: string | null,
  domainName: string | null,
];

const WEEKLY_BOSS_SEEDS: Record<string, WeeklyBossSeed> = {
  DvalinsSigh: ["Dvalin's Sigh", "StormterrorDvalin", "Stormterror Dvalin", "Confront Stormterror"],
  DvalinsPlume: ["Dvalin's Plume", "StormterrorDvalin", "Stormterror Dvalin", "Confront Stormterror"],
  DvalinsClaw: ["Dvalin's Claw", "StormterrorDvalin", "Stormterror Dvalin", "Confront Stormterror"],
  TailOfBoreas: ["Tail of Boreas", "LupusBoreas", "Lupus Boreas", "Wolf of the North Challenge"],
  RingOfBoreas: ["Ring of Boreas", "LupusBoreas", "Lupus Boreas", "Wolf of the North Challenge"],
  SpiritLocketOfBoreas: ["Spirit Locket of Boreas", "LupusBoreas", "Lupus Boreas", "Wolf of the North Challenge"],
  TuskOfMonocerosCaeli: ["Tusk of Monoceros Caeli", "Childe", "Childe", "Enter the Golden House"],
  ShardOfAFoulLegacy: ["Shard of a Foul Legacy", "Childe", "Childe", "Enter the Golden House"],
  ShadowOfTheWarrior: ["Shadow of the Warrior", "Childe", "Childe", "Enter the Golden House"],
  DragonLordsCrown: ["Dragon Lord's Crown", "Azhdaha", "Azhdaha", "Beneath the Dragon-Queller"],
  BloodjadeBranch: ["Bloodjade Branch", "Azhdaha", "Azhdaha", "Beneath the Dragon-Queller"],
  GildedScale: ["Gilded Scale", "Azhdaha", "Azhdaha", "Beneath the Dragon-Queller"],
  AshenHeart: ["Ashen Heart", "LaSignora", "La Signora", "Narukami Island: Tenshukaku"],
  MoltenMoment: ["Molten Moment", "LaSignora", "La Signora", "Narukami Island: Tenshukaku"],
  HellfireButterfly: ["Hellfire Butterfly", "LaSignora", "La Signora", "Narukami Island: Tenshukaku"],
  TearsOfTheCalamitousGod: ["Tears of the Calamitous God", "MagatsuMitakeNarukamiNoMikoto", "Magatsu Mitake Narukami no Mikoto", "End of the Oneiric Euthymia"],
  MudraOfTheMaleficGeneral: ["Mudra of the Malefic General", "MagatsuMitakeNarukamiNoMikoto", "Magatsu Mitake Narukami no Mikoto", "End of the Oneiric Euthymia"],
  TheMeaningOfAeons: ["The Meaning of Aeons", "MagatsuMitakeNarukamiNoMikoto", "Magatsu Mitake Narukami no Mikoto", "End of the Oneiric Euthymia"],
  PuppetStrings: ["Puppet Strings", "ShoukiNoKamiTheProdigal", "Shouki no Kami, the Prodigal", "Joururi Workshop"],
  MirrorOfMushin: ["Mirror of Mushin", "ShoukiNoKamiTheProdigal", "Shouki no Kami, the Prodigal", "Joururi Workshop"],
  DakasBell: ["Daka's Bell", "ShoukiNoKamiTheProdigal", "Shouki no Kami, the Prodigal", "Joururi Workshop"],
  WorldspanFern: ["Worldspan Fern", "GuardianOfApepsOasis", "Guardian of Apep's Oasis", "The Realm of Beginnings"],
  PrimordialGreenbloom: ["Primordial Greenbloom", "GuardianOfApepsOasis", "Guardian of Apep's Oasis", "The Realm of Beginnings"],
  Everamber: ["Everamber", "GuardianOfApepsOasis", "Guardian of Apep's Oasis", "The Realm of Beginnings"],
  LightlessSilkString: ["Lightless Silk String", "AllDevouringNarwhal", "All-Devouring Narwhal", "Shadow of Another World"],
  LightlessMass: ["Lightless Mass", "AllDevouringNarwhal", "All-Devouring Narwhal", "Shadow of Another World"],
  LightlessEyeOfTheMaelstrom: ["Lightless Eye of the Maelstrom", "AllDevouringNarwhal", "All-Devouring Narwhal", "Shadow of Another World"],
  FadingCandle: ["Fading Candle", "TheKnave", "The Knave", "The Knave"],
  SilkenFeather: ["Silken Feather", "TheKnave", "The Knave", "The Knave"],
  DenialAndJudgment: ["Denial and Judgment", "TheKnave", "The Knave", "The Knave"],
  ErodedHorn: ["Eroded Horn", null, null, null],
  ErodedScaleFeather: ["Eroded Scale-Feather", null, null, null],
  ErodedSunfire: ["Eroded Sunfire", null, null, null],
  AscendedSampleKnight: ["Ascended Sample: Knight", null, null, null],
  AscendedSampleRook: ["Ascended Sample: Rook", null, null, null],
  AscendedSampleQueen: ["Ascended Sample: Queen", null, null, null],
  MaskOfTheVirtuousDoctor: ["Mask of the Virtuous Doctor", null, null, null],
  ElixirOfTheHeretic: ["Elixir of the Heretic", null, null, null],
};

function resolveWeeklyBossSource(seed: WeeklyBossSeed) {
  const mappedDomainKey = WEEKLY_TALENT_MATERIAL_TO_TROUNCE_DOMAIN_KEY[seed[0]];
  const mappedDomain = mappedDomainKey ? TROUNCE_DOMAINS[mappedDomainKey] : undefined;
  if (mappedDomain) {
    return {
      type: "weekly_boss" as const,
      bossKey: mappedDomainKey,
      bossName: mappedDomain.name,
      domainName: mappedDomain.name,
    };
  }

  const [, bossKey, bossName, domainName] = seed;
  if (bossKey) {
    return {
      type: "weekly_boss" as const,
      bossKey,
      bossName,
      domainName,
    };
  }

  return {
    type: "unresolved" as const,
    reason: "Weekly boss source requires verification from allowed sources.",
  };
}

export const WEEKLY_BOSS_MATERIALS: Record<string, WeeklyBossMaterial> = Object.fromEntries(
  Object.entries(WEEKLY_BOSS_SEEDS).map(([key, seed]) => [
    key,
    {
      key,
      displayName: seed[0],
      category: "weekly_boss_material",
      source: resolveWeeklyBossSource(seed),
      usedFor: ["talent_leveling"],
      craftable: false,
      status: resolveWeeklyBossSource(seed).type === "weekly_boss" ? "verified" : "beta",
    } satisfies WeeklyBossMaterial,
  ]),
) as Record<string, WeeklyBossMaterial>;

export function buildWeeklyBossMaterialRegistry(): {
  weeklyBossMaterials: StaticGameData["weeklyBossMaterials"];
  materials: Record<string, MaterialDescriptor>;
  materialSources: Record<string, MaterialSourceRecord[]>;
} {
  const weeklyBossMaterials = WEEKLY_BOSS_MATERIALS;
  const materials = Object.fromEntries(
    Object.values(weeklyBossMaterials).map((item) => [
      item.key,
      {
        key: item.key,
        displayName: item.displayName,
        category: "weekly_boss",
      } satisfies MaterialDescriptor,
    ]),
  );
  const materialSources = Object.fromEntries(
    Object.values(weeklyBossMaterials).flatMap((item) => {
      if (item.source.type !== "weekly_boss") {
        return [];
      }

      return [
        [
          item.key,
          [
            {
              materialKey: item.key,
              sourceType: "weekly_boss",
              sourceKey: item.source.bossKey ?? item.key,
              sourceName: item.source.domainName ?? item.source.bossName ?? item.displayName,
              availability: "WEEKLY",
              notes: item.source.bossName ?? item.displayName,
            } satisfies MaterialSourceRecord,
          ],
        ] satisfies [string, MaterialSourceRecord[]],
      ];
    }),
  );

  return {
    weeklyBossMaterials,
    materials,
    materialSources,
  };
}
