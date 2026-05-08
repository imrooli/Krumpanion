import fs from "node:fs";
import path from "node:path";
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbPersistenceAdapter } from "./persistence";
import { importGoodAccountFromText } from "./goodImport";
import { createDefaultSaveFile } from "../domain/save/types";

function collectGoodFiles(root: string): string[] {
  const results: string[] = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectGoodFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

describe("GOOD corpus readiness", () => {
  const examplesRoot = path.resolve(process.cwd(), "..", "GOOD_examples");
  const files = collectGoodFiles(examplesRoot);

  it("parses every example GOOD file into account state", () => {
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      const result = importGoodAccountFromText(text);
      expect(result.errors, path.basename(file)).toEqual([]);
      expect(result.account, path.basename(file)).not.toBeNull();
    }
  });

  it("round-trips selected corpus files through the save adapter", async () => {
    const adapter = new IndexedDbPersistenceAdapter();
    const sampleFiles = [files[0], files[Math.floor(files.length / 2)], files[files.length - 1]].filter(Boolean);

    for (const file of sampleFiles) {
      const text = fs.readFileSync(file, "utf8");
      const result = importGoodAccountFromText(text);
      expect(result.account, path.basename(file)).not.toBeNull();

      const saveFile = {
        ...createDefaultSaveFile(),
      };
      const activeAccountId = saveFile.user.activeAccountId;
      saveFile.user.accountsById[activeAccountId] = {
        ...saveFile.user.accountsById[activeAccountId],
        ...result.account!,
      };

      await adapter.saveSaveFile(saveFile);
      const exported = await adapter.exportSaveFile();
      const imported = await adapter.importSaveFile(exported);
      const importedAccount = imported.user.accountsById[imported.user.activeAccountId];

      expect(importedAccount.characters.length, path.basename(file)).toBe(result.account?.characters.length);
      expect(importedAccount.weapons.length, path.basename(file)).toBe(result.account?.weapons.length);
      expect(Object.keys(importedAccount.inventory ?? {}).length, path.basename(file)).toBe(
        Object.keys(result.account?.inventory ?? {}).length,
      );
    }
  });
});
