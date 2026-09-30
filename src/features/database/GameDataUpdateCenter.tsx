import { WEEKDAYS, availabilityDays, availabilityFromDays } from "../../utils/days";
import { farmingConfigurationFor } from "../../domain/staticData/farmingConfiguration";
import { plannerReadiness } from "../../domain/staticData/plannerReadiness";
import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { farmingRequirements, groupFarmingRequirements } from "../../domain/staticData/plannerReadiness";
import { buildFarmingOverride, type FarmingConfiguration } from "../../domain/staticData/farmingConfiguration";
import type { MaterialSourceType } from "../../domain/staticData/types";
import type { AvailabilityGroupKey } from "../../domain/planner/types";
import { identityRecords } from "../../domain/staticData/entityIdentity";

export type UpdateCenterView = "gameData" | "automaticData" | "farmingSetup" | "discoveries" | "diagnostics";
const SOURCE_OPTIONS: Array<[MaterialSourceType, string]> = [["other", "Choose source"], ["normal_boss", "Normal boss"], ["weekly_boss", "Weekly boss / trounce domain"], ["domain_of_mastery", "Talent domain"], ["domain_of_forgery", "Weapon domain"], ["enemy_drop", "Enemy drops"], ["local_specialty", "Local specialty"], ["world_gathering", "World gathering"], ["forging", "Forging"], ["alchemy", "Alchemy / special reward"]];
const DAYS: Array<[AvailabilityGroupKey, string]> = [["UNKNOWN", "Needs schedule"], ["MON_THU_SUN", "Monday / Thursday / Sunday"], ["TUE_FRI_SUN", "Tuesday / Friday / Sunday"], ["WED_SAT_SUN", "Wednesday / Saturday / Sunday"], ["ALWAYS", "Every day"], ["WEEKLY", "Weekly"]];

function FarmingEditor({ materialKey }: { materialKey: string }) {
  const data = useAppStore(state => state.staticData);
  const draft = useAppStore(state => state.overridePack?.farmingDrafts?.[materialKey]);
  const [openedForm] = useState(() => draft ?? farmingConfigurationFor(data, materialKey));
  const [form, setForm] = useState<FarmingConfiguration>(() => draft ?? farmingConfigurationFor(data, materialKey));
  const [editAll, setEditAll] = useState(false);
  const initial = farmingConfigurationFor(data, materialKey);
  const needsSource = !initial.sourceKey || !initial.sourceName || initial.sourceType === "other";
  const needsFamily = !initial.familyKey;
  const needsResin = initial.resinCost === undefined;
  const origin = useAppStore(state => state.overridePack?.farmingOrigins?.[initial.familyKey ? `family:${initial.familyKey}` : `material:${materialKey}`]);
  const [message, setMessage] = useState("");
  const patch = (value: Partial<FarmingConfiguration>) => setForm(current => ({ ...current, ...value }));
  const tierCount = form.sourceType === "domain_of_mastery" || form.sourceType === "enemy_drop" ? 3 : form.sourceType === "domain_of_forgery" ? 4 : 0;
  const materials = useMemo(() => Object.values(data.materials).sort((a, b) => a.displayName.localeCompare(b.displayName)), [data]);
  const sources = useMemo(() => [...new Map(Object.values(data.materialSources).flat().filter(source => source.sourceType === form.sourceType).map(source => [source.sourceKey, source])).values()], [data, form.sourceType]);
  const families = form.sourceType === "domain_of_mastery" ? data.talentBookFamilies : form.sourceType === "domain_of_forgery" ? data.weaponAscensionFamilies : data.enemyDropFamilies;
  function selectFamily(key: string) {
    const talent = data.talentBookFamilies[key]; const weapon = data.weaponAscensionFamilies[key]; const enemy = data.enemyDropFamilies[key];
    patch({ familyKey: key, tierKeys: form.sourceType === "domain_of_mastery" && talent ? [talent.teachings, talent.guide, talent.philosophies] : form.sourceType === "domain_of_forgery" && weapon ? [weapon.tier1, weapon.tier2, weapon.tier3, weapon.tier4] : enemy ? [enemy.low, enemy.mid, enemy.high] : form.tierKeys });
  }
  return <article className="panel">
    <h3>{data.materials[materialKey]?.displayName}</h3>
    <p>Configure this shared resource once for every character and weapon that uses it.</p>
    {!needsFamily && <p>Family: {initial.tierKeys.map(key => data.materials[key]?.displayName ?? key).join(" / ")}</p>}
    {!needsSource && <p>Domain / source: {initial.sourceName} — {origin?.source?.source === "upstream" ? "Automatically identified" : "Configured"}</p>}
    {!needsResin && <p>Resin cost: {initial.resinCost} — {origin?.resinCost?.source === "upstream" ? "Automatically identified" : "Configured"}</p>}
    <button type="button" onClick={() => setEditAll(value => !value)}>{editAll ? "Show missing fields" : "Edit established information"}</button>
    <div className="card-grid">
      {(editAll || needsSource) && <><label>Source category<select className="text-input" value={form.sourceType} onChange={event => patch({ sourceType: event.target.value as MaterialSourceType, sourceKey: "", familyKey: "", tierKeys: [] })}>{SOURCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Existing source<select className="text-input" value={sources.some(source => source.sourceKey === form.sourceKey) ? form.sourceKey : ""} onChange={event => { const source = sources.find(row => row.sourceKey === event.target.value); if (source) patch({ sourceKey: source.sourceKey, sourceName: source.sourceName, availability: source.availability, resinCost: source.resinCost, region: source.region ?? "" }); }}><option value="">Create a source or choose one</option>{sources.map(source => <option key={source.sourceKey} value={source.sourceKey}>{source.sourceName}</option>)}</select></label>
      <label>Source / domain name<input className="text-input" value={form.sourceName} onChange={event => patch({ sourceName: event.target.value })} /></label>
      </>}
      <label>Availability<select className="text-input" value={form.availability} onChange={event => patch({ availability: event.target.value as AvailabilityGroupKey })}>{form.availability.startsWith("DAYS_") && <option value={form.availability}>Custom weekdays</option>}{DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {form.sourceType !== "weekly_boss" && <fieldset><legend>Available weekdays</legend><p>Choose the days for this material family. Manual schedules are shared by all its consumers.</p>{WEEKDAYS.map(day => <label key={day}><input type="checkbox" checked={availabilityDays(form.availability).includes(day)} onChange={event => patch({ availability: availabilityFromDays(event.target.checked ? [...availabilityDays(form.availability), day] : availabilityDays(form.availability).filter(value => value !== day)) })} />{day}</label>)}</fieldset>}
      {(editAll || needsResin) && <label>{form.sourceType === "weekly_boss" ? "Resin per discounted weekly claim" : "Resin per claim"}<input className="text-input" type="number" min="0" value={form.resinCost ?? ""} onChange={event => patch({ resinCost: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>}
      {form.sourceType === "weekly_boss" && <p>After the weekly discounts, the existing trounce-domain full cost applies (60 Resin for a new source).</p>}
      {editAll && <label>Region<input className="text-input" value={form.region} onChange={event => patch({ region: event.target.value })} /></label>}
      {tierCount > 0 && (editAll || needsFamily) && <><label>Material family<input className="text-input" list="farming-families" value={form.familyKey} onChange={event => selectFamily(event.target.value)} /><datalist id="farming-families">{Object.keys(families).map(key => <option key={key} value={key} />)}</datalist></label>{Array.from({ length: tierCount }, (_, index) => <label key={index}>Family tier {index + 1} (lowest first)<select className="text-input" value={form.tierKeys[index] ?? ""} onChange={event => { const tierKeys = [...form.tierKeys]; tierKeys[index] = event.target.value; patch({ tierKeys }); }}><option value="">Choose imported material</option>{materials.map(material => <option key={material.key} value={material.key}>{material.displayName}</option>)}</select></label>)}</>}
    </div>
    <button className="button-primary" type="button" onClick={async () => { try { const state = useAppStore.getState(); const latest = farmingConfigurationFor(state.staticData, materialKey);
      const edits = Object.fromEntries(Object.entries(form).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(openedForm[key as keyof FarmingConfiguration])));
      const pack = buildFarmingOverride(state.staticData, state.overridePack, { ...latest, ...edits }); await state.importOverrideText(JSON.stringify(pack)); setMessage("Farming data saved. Readiness recalculated."); } catch (error) { setMessage(String(error)); } }}>Save Farming Data</button>
    {message && <p role="status">{message}</p>}
  </article>;
}

export function GameDataUpdateCenter({ view, onNavigate }: { view: UpdateCenterView; onNavigate: (view: UpdateCenterView) => void }) {
  const data = useAppStore(state => state.staticData);
  const update = useAppStore(state => state.gameDataUpdates);
  const check = useAppStore(state => state.checkGameDataUpdates);
  const importBundle = useAppStore(state => state.importGameDataBundle);
  const cancel = useAppStore(state => state.cancelGameDataUpdate);
  const resolveConflict = useAppStore(state => state.resolveFarmingConflict);
  const conflicts = useAppStore(state => state.overridePack?.farmingConflicts);
  const [conflictError, setConflictError] = useState("");
  const ignore = useAppStore(state => state.setDiscoveryIgnored);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const requirements = useMemo(() => farmingRequirements(data, [...Object.keys(data.characters), ...Object.keys(data.weapons)]), [data]);
  const sharedRequirements = groupFarmingRequirements(data, requirements);
  const busy = update.status === "checking" || update.status === "downloading";
  if (view === "gameData") return <section className="panel">
    <h2>Game Data</h2><p>Live character, weapon, and progression data updates automatically. Verified material families and domain relationships import automatically. Configure the remaining farming sources and weekdays.</p>
    <dl><dt>Bundled database</dt><dd>{data.version}</dd><dt>Effective database</dt><dd>{data.version} + {update.effectiveVersion} local update(s)</dd><dt>AnimeGameData2 revision</dt><dd>{update.appliedRevision ?? "Not synchronized"}</dd><dt>Last checked upstream revision</dt><dd>{update.checkedRevision ?? "Never"}</dd><dt>Extractor capability</dt><dd>{update.appliedExtractorVersion ?? 1}</dd><dt>Upstream release</dt><dd>{update.releaseVersion ?? "Unknown"}</dd><dt>Last checked</dt><dd>{update.lastChecked ?? "Never"}</dd><dt>Last synchronized</dt><dd>{update.lastSynchronized ?? "Never"}</dd></dl>
    <div className="button-row"><button className="button-primary" disabled={busy} onClick={() => void check("manual")}>Check for Updates</button>{busy && <button onClick={cancel}>Cancel Update</button>}<label className="button-secondary">Import Dataset Bundle<input aria-label="Import Dataset Bundle" type="file" accept=".json" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; if (file) await importBundle(await file.text()); }} /></label></div>
    <p role="status">{busy ? update.status === "checking" ? "Checking the live game database..." : "Downloading and validating game data..." : update.status === "updated" ? "Game database updated" : update.status === "current" ? "Game database is current" : "Daily checks run when the app opens."}</p>
    {update.error && <p role="alert">{update.error} Your saved database and inventory remain available.</p>}
    {update.retryAfter && <p>Upstream retry available after {update.retryAfter}. Dataset bundle import remains available.</p>}
    {update.lastDelta && <article><h3>Last update</h3><p>{update.lastDelta.added} added · {update.lastDelta.changed} changed · {update.lastDelta.unchanged} unchanged · {update.lastDelta.review} review findings</p><p>{update.lastDelta.progression} progression profiles · {update.lastDelta.families} families · {update.lastDelta.domains} domain relationships configured</p><p>Planner ready: {update.lastDelta.affectedKeys.filter(key => plannerReadiness(data, key).state === "planner_ready").length} / {update.lastDelta.affectedKeys.length} affected characters and weapons</p></article>}
    <button className="button-secondary" onClick={() => onNavigate("farmingSetup")}>Configure Farming Data ({requirements.length})</button>
    {update.diagnostics.length > 0 && <details><summary>Upstream diagnostics ({update.diagnostics.length})</summary><ul>{update.diagnostics.map((row, index) => <li key={index}>{row.dataset ?? row.entityType} {row.field} {row.recordId ?? row.gameId}: {row.message}</li>)}</ul></details>}
  </section>;
  if (view === "diagnostics") return <section className="panel"><h2>Upstream Diagnostics</h2>{update.lastAttempt && <details open><summary>Latest synchronization</summary><pre>{JSON.stringify(update.lastAttempt, null, 2)}</pre></details>}{update.lastSuccessfulAttempt && <details><summary>Last successful update</summary><pre>{JSON.stringify(update.lastSuccessfulAttempt, null, 2)}</pre></details>}{update.error && <p role="alert">{update.error}</p>}<ul>{update.diagnostics.map((row, index) => <li key={index}>{row.dataset ?? row.entityType} {row.field} {row.recordId ?? row.gameId}: {row.message}</li>)}</ul>{!update.diagnostics.length && <p>No upstream findings.</p>}</section>;
  if (view === "farmingSetup") return <section><article className="panel"><h2>Farming Setup</h2>{conflictError && <p role="alert">{conflictError}</p>}{Object.values(conflicts ?? {}).filter(row => row.status === "pending").map(row => <article key={row.id}><h3>Review {row.field}: {data.materials[row.materialKey]?.displayName}</h3><p>Your configuration was preserved. Upstream proposes {row.field === "source" ? row.proposed.sourceName : row.field === "family" ? row.proposed.tierKeys.join(" / ") : row.proposed[row.field]}.</p>{[false, true].map(useUpstream => <button key={String(useUpstream)} onClick={() => void resolveConflict(row.id, useUpstream).catch(error => setConflictError(String(error)))}>{useUpstream ? "Use upstream" : "Keep manual"}</button>)}</article>)}<p>{sharedRequirements.length} shared resource(s) need farming information. Incomplete drafts can be saved.</p><ul>{sharedRequirements.map(row => <li key={row.materialKey}><button onClick={() => setSelected(row.materialKey)}>{data.materials[row.materialKey]?.displayName ?? row.materialKey}</button> — {row.fields.join(", ")} <small>({row.affectedKeys.join(", ")})</small></li>)}</ul><label>Find material<input className="text-input" value={materialSearch} onChange={event => setMaterialSearch(event.target.value)} /></label><label>Edit material<select className="text-input" value={selected} onChange={event => setSelected(event.target.value)}><option value="">Select a material</option>{Object.values(data.materials).filter(material => material.key === selected || material.displayName.toLowerCase().includes(materialSearch.toLowerCase())).sort((a, b) => Number(b.key === selected) - Number(a.key === selected) || a.displayName.localeCompare(b.displayName)).slice(0, 100).map(material => <option key={material.key} value={material.key}>{material.displayName}</option>)}</select></label></article>{selected && <FarmingEditor key={selected} materialKey={selected} />}</section>;
  if (view === "discoveries") return <section className="panel"><h2>Discoveries</h2><p>Unknown GOOD entities are preserved until their identities can be resolved.</p>{!Object.keys(update.discoveries).length && <p>No discoveries.</p>}<ul>{Object.values(update.discoveries).map(row => <li key={row.id}>{row.rawKey} ({row.entityType}) — {row.status}{row.candidateKey && ` â†’ ${row.candidateKey}`} {row.status !== "resolved" && <button onClick={() => void ignore(row.id, row.status !== "ignored")}>{row.status === "ignored" ? "Review again" : "Ignore"}</button>}{row.notes && <p>{row.notes}</p>}</li>)}</ul></section>;
  const records = (["character", "weapon", "material", "artifactSet"] as const).flatMap(type => identityRecords(data, type).filter(row => row.provenance).map(row => ({ ...row, type }))).filter(row => row.displayName.toLowerCase().includes(search.toLowerCase()));
  return <section className="panel"><h2>Automatic Data</h2><label>Find imported records<input className="text-input" value={search} onChange={event => setSearch(event.target.value)} /></label><p>{records.length} records</p><ul>{records.slice(0, 200).map(row => { const readiness = row.type === "character" || row.type === "weapon" ? plannerReadiness(data, row.key) : undefined; return <li key={`${row.type}:${row.key}`}>{row.displayName} — {row.type}, game ID {row.gameId}{readiness && ` — ${readiness.progressionComplete ? "Progression complete; " : ""}${readiness.state.replace(/_/g, " ")}`}</li>; })}</ul>{records.length > 200 && <p>Showing the first 200 matches. Narrow the search to find other records.</p>}</section>;
}
