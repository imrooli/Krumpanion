import { resolveInventoryMaterialKey } from "../staticData/materialKeyMapping";
import type { StaticGameData } from "../staticData/types";

export interface BulkInventoryValidUpdate {
  inputName: string;
  materialKey: string;
  displayName: string;
  quantity: number;
}

export interface BulkInventoryUnmatchedRow {
  rowNumber: number;
  inputName: string;
  rawQuantity?: string;
  reason: string;
}

export interface BulkInventoryDuplicateRow {
  materialKey: string;
  displayName: string;
  rowNumbers: number[];
  resolvedQuantity: number;
}

export interface BulkInventoryInvalidRow {
  rowNumber: number;
  raw: string;
  reason: string;
}

export interface BulkInventoryParseResult {
  validUpdates: BulkInventoryValidUpdate[];
  unmatchedRows: BulkInventoryUnmatchedRow[];
  duplicateRows: BulkInventoryDuplicateRow[];
  invalidRows: BulkInventoryInvalidRow[];
}

interface ParsedLine {
  inputName: string;
  rawQuantity: string;
}

function parseLine(raw: string): ParsedLine | null {
  if (!raw.trim()) {
    return null;
  }

  if (raw.includes("\t")) {
    const parts = raw.split("\t").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        inputName: parts.slice(0, -1).join(" ").trim(),
        rawQuantity: parts.at(-1) ?? "",
      };
    }
  }

  const commaIndex = raw.lastIndexOf(",");
  if (commaIndex >= 0) {
    return {
      inputName: raw.slice(0, commaIndex).trim(),
      rawQuantity: raw.slice(commaIndex + 1).trim(),
    };
  }

  return {
    inputName: "",
    rawQuantity: "",
  };
}

function parseQuantity(rawQuantity: string): number | null {
  const trimmed = rawQuantity.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function resolveBulkInventoryMaterialKey(inputName: string, staticData: StaticGameData): string | null {
  if (staticData.materials[inputName]) {
    return inputName;
  }

  const byDisplayName = Object.values(staticData.materials).find(
    (material) => material.displayName.trim().toLowerCase() === inputName.trim().toLowerCase(),
  );
  if (byDisplayName) {
    return byDisplayName.key;
  }

  const canonicalKey = resolveInventoryMaterialKey(inputName);
  if (canonicalKey && staticData.materials[canonicalKey]) {
    return canonicalKey;
  }

  return null;
}

export function parseBulkInventoryText(text: string, staticData: StaticGameData): BulkInventoryParseResult {
  const unmatchedRows: BulkInventoryUnmatchedRow[] = [];
  const invalidRows: BulkInventoryInvalidRow[] = [];
  const resolved = new Map<
    string,
    {
      inputName: string;
      materialKey: string;
      displayName: string;
      quantity: number;
      rowNumbers: number[];
    }
  >();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const rowNumber = index + 1;
    if (!rawLine.trim()) {
      return;
    }

    const parsed = parseLine(rawLine);
    if (!parsed || !parsed.inputName || !parsed.rawQuantity) {
      invalidRows.push({
        rowNumber,
        raw: rawLine,
        reason: "Expected 'material, quantity' or 'material<TAB>quantity'.",
      });
      return;
    }

    const quantity = parseQuantity(parsed.rawQuantity);
    if (quantity === null) {
      invalidRows.push({
        rowNumber,
        raw: rawLine,
        reason: "Quantity must be a non-negative integer.",
      });
      return;
    }

    const materialKey = resolveBulkInventoryMaterialKey(parsed.inputName, staticData);
    if (!materialKey) {
      unmatchedRows.push({
        rowNumber,
        inputName: parsed.inputName,
        rawQuantity: parsed.rawQuantity,
        reason: "No canonical material matched this row.",
      });
      return;
    }

    const existing = resolved.get(materialKey);
    if (existing) {
      existing.quantity += quantity;
      existing.rowNumbers.push(rowNumber);
      return;
    }

    resolved.set(materialKey, {
      inputName: parsed.inputName,
      materialKey,
      displayName: staticData.materials[materialKey]?.displayName ?? materialKey,
      quantity,
      rowNumbers: [rowNumber],
    });
  });

  const validUpdates: BulkInventoryValidUpdate[] = [];
  const duplicateRows: BulkInventoryDuplicateRow[] = [];

  for (const row of resolved.values()) {
    validUpdates.push({
      inputName: row.inputName,
      materialKey: row.materialKey,
      displayName: row.displayName,
      quantity: row.quantity,
    });

    if (row.rowNumbers.length > 1) {
      duplicateRows.push({
        materialKey: row.materialKey,
        displayName: row.displayName,
        rowNumbers: row.rowNumbers,
        resolvedQuantity: row.quantity,
      });
    }
  }

  validUpdates.sort((left, right) => left.displayName.localeCompare(right.displayName));
  duplicateRows.sort((left, right) => left.displayName.localeCompare(right.displayName));

  return {
    validUpdates,
    unmatchedRows,
    duplicateRows,
    invalidRows,
  };
}
