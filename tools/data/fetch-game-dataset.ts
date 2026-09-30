import { writeFile } from "node:fs/promises";
import { checkAnimeRevision, fetchAnimeBundle } from "../../src/adapters/gameDataTransport";

const revision = await checkAnimeRevision();
const output = process.argv[2] ?? `animegamedata2-${revision.revision.slice(0, 8)}.json`;
await writeFile(output, JSON.stringify(await fetchAnimeBundle(revision)));
console.log(`Saved ${output}. Import this file in Database → Game Data.`);
