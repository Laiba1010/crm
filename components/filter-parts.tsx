"use client";

import * as React from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  FILTER_GROUP_ORDER,
  OPERATORS,
  RELATIVE_DATES,
  newRuleId,
  type FilterField,
  type FilterOperator,
  type FilterOption,
  type FilterRule,
} from "@/lib/deal-filter";

/** Shared popover panel look. Inline, because the shared popover has no class merge. */
export const PANEL_STYLE = { width: "18rem", padding: 0, gap: 0 } as const;

/* ----------------------------------------------------------------------------
 * OptionList: a short list with arrow-key navigation (one tab stop)
 * ------------------------------------------------------------------------- */

export function OptionList({
  options,
  value,
  onSelect,
  ariaLabel,
}: {
  options: readonly FilterOption[];
  value?: string;
  onSelect: (value: string) => void;
  ariaLabel: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const stop = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const current = refs.current.findIndex(
      (el) => el === document.activeElement,
    );
    const last = options.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowDown"
            ? Math.min(current + 1, last)
            : Math.max(current - 1, 0);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="flex flex-col p-1"
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="option"
            aria-selected={selected}
            autoFocus={i === stop}
            tabIndex={i === stop ? 0 : -1}
            onClick={() => onSelect(o.value)}
            className="flex h-8 items-center gap-2 px-2 text-left text-xs outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            {selected && <Check aria-hidden className="size-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * ValueStep: pick or type the value. Used when adding and when editing a chip.
 * Lists submit on click; typed values submit on Enter or "Done".
 * ------------------------------------------------------------------------- */

export function ValueStep({
  field,
  operator,
  value = "",
  valueTo = "",
  onSubmit,
}: {
  field: FilterField;
  operator: FilterOperator;
  value?: string;
  valueTo?: string;
  onSubmit: (value: string, valueTo?: string) => void;
}) {
  const [from, setFrom] = React.useState(value);
  const [to, setTo] = React.useState(valueTo);

  if (field.type === "select") {
    const options = field.options ?? [];
    if (options.length > 6) {
      return (
        <Command>
          <CommandInput
            autoFocus
            placeholder={`Search ${field.label.toLowerCase()}…`}
            aria-label={`Search ${field.label}`}
          />
          <CommandList className="max-h-60">
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  data-checked={o.value === value}
                  onSelect={() => onSubmit(o.value)}
                >
                  <span className="min-w-0 truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      );
    }
    return options.length === 0 ? (
      <p className="px-3 py-4 text-xs text-muted-foreground">
        No options available.
      </p>
    ) : (
      <OptionList
        ariaLabel={field.label}
        options={options}
        value={value}
        onSelect={(v) => onSubmit(v)}
      />
    );
  }

  if (field.type === "date" && operator === "relative") {
    return (
      <OptionList
        ariaLabel={field.label}
        options={RELATIVE_DATES}
        value={value}
        onSelect={(v) => onSubmit(v)}
      />
    );
  }

  const between = operator === "between";
  const complete = from.trim() !== "" && (!between || to.trim() !== "");
  const inputType =
    field.type === "date"
      ? "date"
      : field.type === "number"
        ? "number"
        : "text";

  const box = (
    v: string,
    set: (v: string) => void,
    aria: string,
    auto?: boolean,
  ) =>
    field.type === "number" && field.prefix ? (
      <InputGroup>
        <InputGroupAddon align="inline-start">{field.prefix}</InputGroupAddon>
        <InputGroupInput
          autoFocus={auto}
          type="number"
          inputMode="decimal"
          value={v}
          aria-label={aria}
          placeholder="0"
          onChange={(e) => set(e.target.value)}
        />
      </InputGroup>
    ) : (
      <Input
        autoFocus={auto}
        type={inputType}
        inputMode={field.type === "number" ? "decimal" : undefined}
        value={v}
        aria-label={aria}
        placeholder={
          field.type === "text"
            ? "Type a value…"
            : field.type === "number"
              ? "0"
              : undefined
        }
        autoComplete="off"
        maxLength={field.type === "text" ? 200 : undefined}
        onChange={(e) => set(e.target.value)}
      />
    );

  return (
    <form
      className="flex flex-col gap-3 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete) onSubmit(from.trim(), between ? to.trim() : undefined);
      }}
    >
      {between ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            {box(from, setFrom, `${field.label}, from`, true)}
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            {box(to, setTo, `${field.label}, to`)}
          </label>
        </div>
      ) : (
        box(from, setFrom, `${field.label} value`, true)
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!complete}>
          Done
        </Button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------------
 * FilterPicker: Property → Operator → Value, then onAdd
 * ------------------------------------------------------------------------- */

export type PickerStep =
  | { kind: "property" }
  | { kind: "operator"; field: FilterField }
  | { kind: "value"; field: FilterField; operator: FilterOperator };

/** Owned by whoever hosts the popover, so Escape can step back before it closes. */
export function usePickerStep() {
  const [step, setStep] = React.useState<PickerStep>({ kind: "property" });
  const back = React.useCallback(() => {
    setStep((s) =>
      s.kind === "value"
        ? { kind: "operator", field: s.field }
        : { kind: "property" },
    );
  }, []);
  const reset = React.useCallback(() => setStep({ kind: "property" }), []);
  return { step, setStep, back, reset };
}

export function FilterPicker({
  fields,
  picker,
  ruleCount,
  onAdd,
  onClearAll,
}: {
  fields: readonly FilterField[];
  picker: ReturnType<typeof usePickerStep>;
  ruleCount: number;
  onAdd: (rule: FilterRule) => void;
  onClearAll: () => void;
}) {
  const { step, setStep, back } = picker;

  if (step.kind === "property") {
    const groups = FILTER_GROUP_ORDER.map((g) => ({
      group: g,
      fields: fields.filter((f) => f.group === g),
    })).filter((g) => g.fields.length > 0);

    return (
      <>
        <Command>
          <CommandInput
            autoFocus
            placeholder="Search filters…"
            aria-label="Search filters"
          />
          <CommandList className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-5rem))]">
            <CommandEmpty>No properties found.</CommandEmpty>
            {groups.map(({ group, fields: groupFields }) => (
              <CommandGroup key={group} heading={group}>
                {groupFields.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={f.label}
                    keywords={[group]}
                    onSelect={() => setStep({ kind: "operator", field: f })}
                  >
                    {f.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        {ruleCount >= 2 && (
          <div className="border-t p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onClearAll}
            >
              Clear all
            </Button>
          </div>
        )}
      </>
    );
  }

  const operatorLabel =
    step.kind === "value"
      ? OPERATORS[step.field.type].find((o) => o.value === step.operator)?.label
      : undefined;

  return (
    <>
      <div className="flex h-9 items-center gap-1 border-b pr-3 pl-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Back"
          onClick={back}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <span className="min-w-0 truncate text-xs">
          <span className="font-medium">{step.field.label}</span>
          {operatorLabel && (
            <span className="text-muted-foreground"> · {operatorLabel}</span>
          )}
        </span>
      </div>

      {step.kind === "operator" ? (
        <OptionList
          ariaLabel={`${step.field.label} operator`}
          options={OPERATORS[step.field.type]}
          onSelect={(op) =>
            setStep({
              kind: "value",
              field: step.field,
              operator: op as FilterOperator,
            })
          }
        />
      ) : (
        <ValueStep
          field={step.field}
          operator={step.operator}
          onSubmit={(value, valueTo) =>
            onAdd({
              id: newRuleId(),
              field: step.field.id,
              operator: step.operator,
              value,
              valueTo,
            })
          }
        />
      )}
    </>
  );
}
