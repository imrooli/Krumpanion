export function createStableEntityId(
  kind: "weapon" | "artifact",
  key: string,
  signatureParts: Array<string | number | boolean | undefined>,
  occurrence: number,
): string {
  const signature = signatureParts
    .map((part) => String(part ?? ""))
    .join("-")
    .replace(/[^a-zA-Z0-9_-]+/g, "_");

  return `${kind}-${key}-${signature}-${occurrence}`;
}
