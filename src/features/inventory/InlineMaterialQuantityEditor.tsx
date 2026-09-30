import { useEffect, useState, type KeyboardEvent } from "react";

interface InlineMaterialQuantityEditorProps {
  materialKey: string;
  materialName?: string;
  quantity: number;
  importedQuantity?: number;
  onCommit: (quantity: number) => void;
  onResetToImported?: () => void;
  showStepButtons?: boolean;
  stepDeltas?: number[];
  showCustomAdd?: boolean;
  className?: string;
}

export function InlineMaterialQuantityEditor({
  materialKey,
  materialName,
  quantity,
  importedQuantity,
  onCommit,
  onResetToImported,
  showStepButtons = true,
  stepDeltas = [-10, -1, 1, 10],
  showCustomAdd = false,
  className = "",
}: InlineMaterialQuantityEditorProps) {
  const [draft, setDraft] = useState(String(quantity));
  const [addDraft, setAddDraft] = useState("");

  useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  const trimmed = draft.trim();
  const addTrimmed = addDraft.trim();
  const isInvalid = trimmed !== "" && !/^\d+$/.test(trimmed);
  const isAddInvalid = addTrimmed !== "" && !/^\d+$/.test(addTrimmed);
  const canReset = typeof importedQuantity === "number" && importedQuantity !== quantity && Boolean(onResetToImported);
  const label = materialName ?? materialKey;
  const negativeDeltas = stepDeltas.filter((delta) => delta < 0);
  const positiveDeltas = stepDeltas.filter((delta) => delta > 0);

  function commitValue() {
    if (trimmed === "") {
      onCommit(0);
      setDraft("0");
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      setDraft(String(quantity));
      return;
    }

    const value = Number(trimmed);
    if (!Number.isSafeInteger(value) || value < 0) {
      setDraft(String(quantity));
      return;
    }

    if (value !== quantity) {
      onCommit(value);
    }
    setDraft(String(value));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      (event.currentTarget as HTMLInputElement).blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(String(quantity));
      (event.currentTarget as HTMLInputElement).blur();
    }
  }

  function handleAddKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomAmount();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setAddDraft("");
      (event.currentTarget as HTMLInputElement).blur();
    }
  }

  function nudge(delta: number) {
    const nextValue = Math.max(0, quantity + delta);
    onCommit(nextValue);
  }

  function addCustomAmount() {
    if (addTrimmed === "" || !/^\d+$/.test(addTrimmed)) {
      setAddDraft("");
      return;
    }

    const amount = Number(addTrimmed);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setAddDraft("");
      return;
    }

    const nextValue = quantity + amount;
    if (!Number.isSafeInteger(nextValue)) {
      setAddDraft("");
      return;
    }

    onCommit(nextValue);
    setAddDraft("");
  }

  return (
    <div className={`inline-quantity-editor ${className}`.trim()}>
      {showStepButtons ? (
        <>
          {negativeDeltas.map((delta) => (
            <button
              key={`${label}-${delta}`}
              type="button"
              className="button-ghost inline-quantity-button"
              onClick={() => nudge(delta)}
              aria-label={`Decrease ${label} by ${Math.abs(delta)}`}
            >
              {delta}
            </button>
          ))}
        </>
      ) : null}
      <input
        className="text-input inventory-quantity-input"
        aria-label={`Quantity for ${label}`}
        inputMode="numeric"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        aria-invalid={isInvalid}
      />
      {showStepButtons ? (
        <>
          {positiveDeltas.map((delta) => (
            <button
              key={`${label}-${delta}`}
              type="button"
              className="button-ghost inline-quantity-button"
              onClick={() => nudge(delta)}
              aria-label={`Increase ${label} by ${delta}`}
            >
              +{delta}
            </button>
          ))}
        </>
      ) : null}
      {canReset ? (
        <button
          type="button"
          className="button-ghost inline-quantity-button"
          onClick={() => onResetToImported?.()}
          aria-label={`Reset ${label} to imported quantity`}
        >
          Reset
        </button>
      ) : null}
      {showCustomAdd ? (
        <span className="inline-quantity-custom-add">
          <input
            className="text-input inline-quantity-add-input"
            aria-label={`Custom amount to add for ${label}`}
            inputMode="numeric"
            placeholder="Add"
            value={addDraft}
            onChange={(event) => setAddDraft(event.target.value)}
            onKeyDown={handleAddKeyDown}
            aria-invalid={isAddInvalid}
          />
          <button
            type="button"
            className="button-ghost inline-quantity-button"
            onClick={addCustomAmount}
            disabled={addTrimmed === "" || isAddInvalid}
            aria-label={`Add custom amount for ${label}`}
          >
            Add
          </button>
        </span>
      ) : null}
    </div>
  );
}
