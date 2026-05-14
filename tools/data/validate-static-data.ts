import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import generatedBetaMaterials from "../../src/data/runtime/generated/betaMaterials.generated.json";
import generatedCharacterProfiles from "../../src/data/runtime/generated/characterMaterialProfiles.generated.json";
import generatedUnresolvedCharacterMaterialReferences from "../../src/data/runtime/generated/unresolvedCharacterMaterialReferences.generated.json";
import generatedWeaponGoalProfiles from "../../src/data/runtime/generated/weaponGoalProfiles.generated.json";
import { validateCanonicalDatabase } from "../../src/data/database/validation/validateDatabase.ts";
import {
  extendStaticDataHealthReport,
  formatStaticDataHealthMarkdown,
  type StaticDataIssue,
  validateStaticData,
} from "../../src/domain/staticData/validateStaticData.ts";
import { loadStaticData } from "../../src/domain/staticData/loadStaticData.ts";

type StaticDataHealthIssueCategory = StaticDataIssue["category"];
type StaticDataIssueSeverity = StaticDataIssue["severity"];

const REQUIRED_GITIGNORE_PATTERNS = [
  "node_modules/",
  "dist/",
  "coverage/",
  "*.tsbuildinfo",
];

function createIssue(
  severity: StaticDataIssueSeverity,
  category: StaticDataHealthIssueCategory,
  code: string,
  message: string,
  options: {
    entityKey?: string;
    entityName?: string;
    suggestedFix?: string;
    relatedKeys?: string[];
  } = {},
): StaticDataIssue {
  return {
    id: [category, code, options.entityKey ?? options.entityName ?? "global"].join(":").replace(/\s+/g, "_"),
    severity,
    category,
    entityKey: options.entityKey,
    entityName: options.entityName,
    message,
    suggestedFix: options.suggestedFix,
    relatedKeys: options.relatedKeys,
  };
}

async function findTsBuildInfoFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];
  const ignored = new Set(["node_modules", "dist", "coverage", ".git"]);

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignored.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".tsbuildinfo")) {
        results.push(path.relative(rootDir, fullPath));
      }
    }
  }

  await walk(rootDir);
  return results;
}

function gitStatusAvailable(rootDir: string): boolean {
  return existsSync(path.join(rootDir, ".git"));
}

function findGeneratedStatusWarnings(rootDir: string): StaticDataIssue[] {
  if (!gitStatusAvailable(rootDir)) {
    return [];
  }

  try {
    const output = execFileSync(
      "git",
      ["status", "--porcelain", "--", "src/data/runtime/generated", "data_sources", "tools/data"],
      { cwd: rootDir, encoding: "utf8" },
    );
    const changed = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.slice(3));

    const changedGenerated = changed.filter((file) => file.startsWith("src/data/runtime/generated/"));
    const changedSources = changed.filter((file) => file.startsWith("data_sources/") || file.startsWith("tools/data/"));
    if (changedGenerated.length > 0 && changedSources.length === 0) {
      return [
        createIssue(
          "warning",
          "repository_hygiene",
          "generated_without_source_changes",
          "Generated runtime files appear modified without matching changes in data_sources or tools/data.",
          {
            entityKey: "src/data/runtime/generated",
            relatedKeys: changedGenerated,
            suggestedFix: "Confirm whether these generated files were rebuilt from tracked source data and builder scripts.",
          },
        ),
      ];
    }
  } catch {
    return [];
  }

  return [];
}

function buildGeneratedMaintenanceIssues(materialKeys: Set<string>): StaticDataIssue[] {
  const issues: StaticDataIssue[] = [];
  const generatedCharacterSourceVersion = (generatedCharacterProfiles as { sourceVersion?: string }).sourceVersion ?? "unknown";
  const generatedWeaponSourceVersion = String((generatedWeaponGoalProfiles as { version?: number }).version ?? "unknown");
  const unresolvedReferences = (
    generatedUnresolvedCharacterMaterialReferences as {
      unresolvedReferences?: Array<{ characterKey: string; displayName: string; materialSlot: string; generatedKey?: string; rawName: string; status: string }>;
    }
  ).unresolvedReferences ?? [];
  const manualReviewWeaponProfiles = Object.keys(
    (generatedWeaponGoalProfiles as { manualReviewProfiles?: Record<string, unknown> }).manualReviewProfiles ?? {},
  );
  const generatedBetaMaterialCount = Object.keys(
    (generatedBetaMaterials as { materials?: Record<string, unknown> }).materials ?? {},
  ).length;

  issues.push(
    createIssue(
      "info",
      "generated_data",
      "legacy_generated_bundle_versions",
      `Legacy generated bundles remain available for maintenance only (character source ${generatedCharacterSourceVersion}, weapon source ${generatedWeaponSourceVersion}).`,
      {
        entityKey: "src/data/runtime/generated",
        suggestedFix: "Do not add new runtime consumers of generated bundles. Migrate any needed data into src/data/database instead.",
      },
    ),
  );
  issues.push(
    createIssue(
      "info",
      "generated_data",
      "legacy_generated_bundle_counts",
      `Legacy generated bundles contain ${generatedBetaMaterialCount} beta materials, ${unresolvedReferences.length} unresolved character material references, and ${manualReviewWeaponProfiles.length} manual-review weapon profiles.`,
      { entityKey: "src/data/runtime/generated" },
    ),
  );

  for (const unresolved of unresolvedReferences) {
    if (!unresolved.generatedKey || !materialKeys.has(unresolved.generatedKey)) {
      continue;
    }

    issues.push(
      createIssue(
        "warning",
        "generated_data",
        "legacy_unresolved_reference_now_canonical",
        `${unresolved.displayName} still has a legacy generated unresolved ${unresolved.materialSlot} reference for ${unresolved.generatedKey}, but that key now exists in canonical static data.`,
        {
          entityKey: `${unresolved.characterKey}:${unresolved.materialSlot}`,
          entityName: unresolved.displayName,
          relatedKeys: [unresolved.generatedKey],
          suggestedFix: "Refresh or retire the generated maintenance bundle so it no longer lags behind canonical data.",
        },
      ),
    );
  }

  return issues;
}

async function buildRepositoryHygieneIssues(rootDir: string): Promise<StaticDataIssue[]> {
  const issues: StaticDataIssue[] = [];
  const gitignoreText = await readFile(path.join(rootDir, ".gitignore"), "utf8");

  for (const pattern of REQUIRED_GITIGNORE_PATTERNS) {
    if (!gitignoreText.includes(pattern)) {
      issues.push(
        createIssue(
          "error",
          "repository_hygiene",
          "missing_gitignore_rule",
          `.gitignore is missing the required ignore rule ${pattern}.`,
          {
            entityKey: pattern,
            suggestedFix: "Add the missing ignore rule so generated or local machine artifacts do not pollute the repository.",
          },
        ),
      );
    }
  }

  if (existsSync(path.join(rootDir, "node_modules"))) {
    issues.push(
      createIssue(
        "info",
        "repository_hygiene",
        "node_modules_present",
        "node_modules is present in the repository working tree.",
        {
          entityKey: "node_modules",
          suggestedFix: "This is expected for local development, but do not rely on copied node_modules across platforms and never commit it.",
        },
      ),
    );
  }

  if (existsSync(path.join(rootDir, "dist"))) {
    issues.push(
      createIssue(
        "warning",
        "repository_hygiene",
        "dist_present",
        "dist is present in the repository working tree.",
        {
          entityKey: "dist",
          suggestedFix: "Delete build output before preparing commits or repository snapshots.",
        },
      ),
    );
  }

  if (existsSync(path.join(rootDir, "coverage"))) {
    issues.push(
      createIssue(
        "warning",
        "repository_hygiene",
        "coverage_present",
        "coverage is present in the repository working tree.",
        {
          entityKey: "coverage",
          suggestedFix: "Remove local coverage output before preparing repository snapshots or patches.",
        },
      ),
    );
  }

  const tsbuildinfoFiles = await findTsBuildInfoFiles(rootDir);
  for (const file of tsbuildinfoFiles) {
    issues.push(
      createIssue(
        "warning",
        "repository_hygiene",
        "tsbuildinfo_present",
        `${file} is present in the repository working tree.`,
        {
          entityKey: file,
          suggestedFix: "Remove transient TypeScript build info files before preparing repository patches.",
        },
      ),
    );
  }

  issues.push(...findGeneratedStatusWarnings(rootDir));
  return issues;
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(scriptDir, "..", "..");
  const staticData = loadStaticData();
  const materialKeys = new Set(Object.keys(staticData.materials));
  const report = validateStaticData(staticData);
  const canonicalReport = validateCanonicalDatabase();
  const hygieneIssues = await buildRepositoryHygieneIssues(rootDir);
  const generatedMaintenanceIssues = buildGeneratedMaintenanceIssues(materialKeys);
  const canonicalIssues = canonicalReport.issues.map((item) =>
    createIssue(item.severity, "repository_hygiene", `canonical_database_${item.category}`, item.message, {
      entityKey: item.key,
    }),
  );
  const finalReport =
    hygieneIssues.length > 0 || canonicalIssues.length > 0 || generatedMaintenanceIssues.length > 0
      ? extendStaticDataHealthReport(report, staticData, [...canonicalIssues, ...generatedMaintenanceIssues, ...hygieneIssues])
      : report;
  const reportDir = path.join(rootDir, "codex", "reports");
  const jsonPath = path.join(reportDir, "static_data_health.json");
  const markdownPath = path.join(reportDir, "static_data_health.md");

  await mkdir(reportDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(finalReport, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${formatStaticDataHealthMarkdown(finalReport)}\n`, "utf8");

  console.log("Static Data Health");
  console.log(`Errors: ${finalReport.summary.errorCount}`);
  console.log(`Warnings: ${finalReport.summary.warningCount}`);
  console.log(`Info: ${finalReport.summary.infoCount}`);
  console.log(`Characters: ${finalReport.summary.completeCharacterProfileCount}/${finalReport.summary.characterCount} complete`);
  console.log(`Weapons: ${finalReport.summary.completeWeaponProfileCount}/${finalReport.summary.weaponCount} complete`);
  console.log(`Missing material sources: ${finalReport.summary.missingMaterialSourceCount}`);
  console.log(`Reports written: ${path.relative(rootDir, jsonPath)}, ${path.relative(rootDir, markdownPath)}`);

  if (finalReport.summary.errorCount > 0) {
    process.exitCode = 1;
  }
}

void main();
