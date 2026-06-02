import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistenceAdapter } from "../../adapters/persistence";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { selectPlannerOutput } from "../../store/selectors";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { WeaponsTab } from "./WeaponsTab";

const FIXED_DATE = new Date("2026-05-07T12:00:00.000Z");

function resetStore() {
  const saveFile = createDefaultSaveFile(FIXED_DATE);
  useAppStore.setState({
    staticData: createStaticData(),
    overridePack: null,
    user: structuredClone(saveFile.user),
    settings: structuredClone(saveFile.settings),
    today: "Monday",
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
    isHydrated: true,
  });
}

function buildGoodWithWeapons(
  weapons: Array<{
    id?: string;
    key: string;
    level: number;
    ascension: number;
    refinement: number;
    location?: string;
    lock?: boolean;
  }>,
) {
  return JSON.stringify({
    format: "GOOD",
    version: 3,
    source: "Test",
    characters: [],
    artifacts: [],
    weapons,
    materials: {
      Mora: 0,
    },
  });
}

function WeaponsHarness() {
  const plannerOutput = useAppStore(selectPlannerOutput);
  return <WeaponsTab plannerOutput={plannerOutput} />;
}

describe("WeaponsTab", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
    resetStore();
  });

  it("switches cleanly between accounts without leaking main-account weapon filters or rows", async () => {
    const user = userEvent.setup();

    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          key: "FavoniusSword",
          level: 80,
          ascension: 5,
          refinement: 5,
          location: "Furina",
          lock: true,
        },
      ]),
      {
        fileName: "main-weapons.json",
        source: "file",
      },
    );

    const mainId = useAppStore.getState().user.activeAccountId;
    const mainWeapon = useAppStore.getState().user.accountsById[mainId]?.weapons[0];
    expect(mainWeapon).toBeDefined();
    if (!mainWeapon) {
      return;
    }

    await useAppStore.getState().createWeaponGoal({
      weaponKey: mainWeapon.weaponKey,
      linkedInventoryInstanceId: mainWeapon.weaponInstanceId,
      linkedCharacterKey: mainWeapon.equippedByCharacterId,
      useOwnedInstance: true,
      targetLevel: 90,
      targetAscensionPhase: 6,
    });

    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });

    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          key: "CoolSteel",
          level: 20,
          ascension: 1,
          refinement: 5,
          location: "",
          lock: false,
        },
      ]),
      {
        fileName: "alt-weapons.json",
        source: "file",
      },
    );

    const altWeapon = useAppStore.getState().user.accountsById[altId]?.weapons[0];
    expect(altWeapon).toBeDefined();
    if (!altWeapon) {
      return;
    }

    await useAppStore.getState().createWeaponGoal({
      weaponKey: altWeapon.weaponKey,
      linkedInventoryInstanceId: altWeapon.weaponInstanceId,
      linkedCharacterKey: altWeapon.equippedByCharacterId,
      useOwnedInstance: true,
      targetLevel: 40,
      targetAscensionPhase: 2,
    });

    await useAppStore.getState().switchAccount(mainId);

    render(<WeaponsHarness />);

    await waitFor(() => {
      expect(screen.getByText("Favonius Sword")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search weapons");
    await user.type(searchInput, "Favonius Sword");
    expect(searchInput).toHaveValue("Favonius Sword");
    expect(screen.queryByText("Cool Steel")).not.toBeInTheDocument();

    await useAppStore.getState().switchAccount(altId);

    await waitFor(() => {
      expect(screen.getByText("Cool Steel")).toBeInTheDocument();
    });

    expect(screen.queryByText("Favonius Sword")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search weapons")).toHaveValue("");
  });

  it("hides raw stale goal ids in the stale-links view", async () => {
    const user = userEvent.setup();

    const goalId = await useAppStore.getState().createWeaponGoal({
      weaponKey: "CoolSteel",
      useOwnedInstance: true,
      targetLevel: 40,
      targetAscensionPhase: 1,
    });
    await useAppStore.getState().updateWeaponGoal(goalId, "CoolSteel", {
      linkStatus: "stale",
      useOwnedInstance: true,
    });

    render(<WeaponsHarness />);

    await user.click(screen.getByRole("button", { name: /stale links/i }));

    expect(screen.getByText("Cool Steel")).toBeInTheDocument();
    expect(screen.getByText(/Owned link missing/i)).toBeInTheDocument();
    expect(screen.queryByText(/Goal weapon-goal-/i)).not.toBeInTheDocument();
  });

  it("pauses and resumes a weapon goal from the progression table", async () => {
    const user = userEvent.setup();

    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          key: "FavoniusSword",
          level: 80,
          ascension: 5,
          refinement: 5,
          location: "Furina",
          lock: true,
        },
      ]),
      {
        fileName: "main-weapons.json",
        source: "file",
      },
    );

    const activeAccountId = useAppStore.getState().user.activeAccountId;
    const ownedWeapon = useAppStore.getState().user.accountsById[activeAccountId]?.weapons[0];
    expect(ownedWeapon).toBeDefined();
    if (!ownedWeapon) {
      return;
    }

    const goalId = await useAppStore.getState().createWeaponGoal({
      weaponKey: ownedWeapon.weaponKey,
      linkedInventoryInstanceId: ownedWeapon.weaponInstanceId,
      useOwnedInstance: true,
      targetLevel: 90,
      targetAscensionPhase: 6,
    });

    render(<WeaponsHarness />);

    await waitFor(() => {
      expect(screen.getByText("Favonius Sword")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(screen.getAllByText("Paused").length).toBeGreaterThan(0));
    expect(selectPlannerOutput(useAppStore.getState()).byWeapon.some((plan) => plan.goalKey === goalId)).toBe(false);

    await user.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(screen.queryByText("Paused")).not.toBeInTheDocument());
    expect(selectPlannerOutput(useAppStore.getState()).byWeapon.some((plan) => plan.goalKey === goalId)).toBe(true);
  });

  it("renders the weapon inventory and refinement workspace with grouped copy details", async () => {
    const user = userEvent.setup();

    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          id: "fav-base",
          key: "FavoniusSword",
          level: 80,
          ascension: 5,
          refinement: 2,
          location: "Furina",
          lock: true,
        },
        {
          id: "fav-dupe-1",
          key: "FavoniusSword",
          level: 1,
          ascension: 0,
          refinement: 1,
          location: "",
          lock: false,
        },
        {
          id: "fav-dupe-2",
          key: "FavoniusSword",
          level: 1,
          ascension: 0,
          refinement: 1,
          location: "",
          lock: false,
        },
      ]),
      {
        fileName: "duplicate-weapons.json",
        source: "file",
      },
    );

    render(<WeaponsHarness />);

    await user.click(screen.getByRole("button", { name: /refinement review/i }));

    expect(screen.getByText("Weapon inventory and refinement")).toBeInTheDocument();
    expect(screen.getByText("Weapon inventory")).toBeInTheDocument();
    expect(screen.getAllByText("Favonius Sword").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Can refine now/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Safe duplicates 2/i)).toBeInTheDocument();

    const inventoryPanel = screen.getByRole("heading", { name: "Weapon inventory" }).closest("article");
    expect(inventoryPanel).not.toBeNull();
    if (!inventoryPanel) {
      return;
    }

    await user.click(within(inventoryPanel).getByText("Review copies"));

    expect(screen.getByText("Base candidate")).toBeInTheDocument();
    expect(screen.getAllByText("Safe duplicate").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("fav-base")).not.toBeInTheDocument();
    expect(screen.queryByText("fav-dupe-1")).not.toBeInTheDocument();
  });

  it("shows manual review for 5-star duplicate weapons", async () => {
    const user = userEvent.setup();

    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          id: "amos-a",
          key: "AmosBow",
          level: 90,
          ascension: 6,
          refinement: 1,
          location: "",
          lock: true,
        },
        {
          id: "amos-b",
          key: "AmosBow",
          level: 1,
          ascension: 0,
          refinement: 1,
          location: "",
          lock: false,
        },
      ]),
      {
        fileName: "amos-duplicates.json",
        source: "file",
      },
    );

    render(<WeaponsHarness />);

    await user.click(screen.getByRole("button", { name: /refinement review/i }));

    expect(screen.getAllByText("Amos' Bow").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Manual review/i).length).toBeGreaterThanOrEqual(1);
  });
});
