import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    key: string;
    level: number;
    ascension: number;
    refinement: number;
    location: string;
    lock: boolean;
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
});
