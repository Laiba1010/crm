"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DEFAULT_FILTER_FIELDS,
  OPERATORS,
  OPERATOR_SYMBOLS,
  changeOperator,
  describeRule,
  formatRuleValue,
  isRuleComplete,
  sanitizeRules,
  type FilterField,
  type FilterOperator,
  type FilterRule,
} from "@/lib/deal-filter";
import {
  FilterPicker,
  OptionList,
  PANEL_STYLE,
  ValueStep,
  usePickerStep,
} from "@/components/filter-parts";

export type FilterBarProps = {
  fields?: readonly FilterField[];
  /** The active rules. Share the same value with <FilterMenu />. */
  value: FilterRule[];
  onValueChange: (rules: FilterRule[]) => void;
  className?: string;
};

/**
 * The active filters, shown right under the toolbar. Each chip is editable in
 * place (change the operator or the value) and removable. With no filters it
 * renders nothing, so the row disappears.
 */
export function FilterBar({
  fields = DEFAULT_FILTER_FIELDS,
  value,
  onValueChange,
  className,
}: FilterBarProps) {
  const addRef = React.useRef<HTMLButtonElement>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const picker = usePickerStep();

  // A saved view or URL may name a field that no longer exists: no chip for it.
  const visible = sanitizeRules(value, fields);
  if (visible.length === 0) return null;

  function remove(id: string) {
    const next = value.filter((r) => r.id !== id);
    onValueChange(next);
    requestAnimationFrame(() => {
      const target =
        sanitizeRules(next, fields).length > 0
          ? addRef.current
          : document.querySelector<HTMLElement>("[data-filter-trigger]");
      target?.focus();
    });
  }

  return (
    <div
      role="group"
      aria-label="Active filters"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {visible.map((rule) => {
        const field = fields.find((f) => f.id === rule.field)!;
        return (
          <FilterChip
            key={rule.id}
            rule={rule}
            field={field}
            fields={fields}
            onChange={(next) =>
              onValueChange(value.map((r) => (r.id === rule.id ? next : r)))
            }
            onRemove={() => remove(rule.id)}
          />
        );
      })}

      <Popover
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (o) picker.reset();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={addRef}
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <Plus aria-hidden />
            Add filter
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-label="Add filter"
          style={PANEL_STYLE}
          onEscapeKeyDown={(e) => {
            if (picker.step.kind !== "property") {
              e.preventDefault();
              picker.back();
            }
          }}
        >
          <FilterPicker
            fields={fields}
            picker={picker}
            ruleCount={value.length}
            onAdd={(rule) => {
              onValueChange([...value, rule]);
              setAddOpen(false);
            }}
            onClearAll={() => {
              onValueChange([]);
              setAddOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * One chip: Field | operator | value | ×
 * ------------------------------------------------------------------------- */

const SEGMENT =
  "flex items-center px-2 outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-inset aria-expanded:bg-muted";

function FilterChip({
  rule,
  field,
  fields,
  onChange,
  onRemove,
}: {
  rule: FilterRule;
  field: FilterField;
  fields: readonly FilterField[];
  onChange: (rule: FilterRule) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = React.useState<"operator" | "value" | null>(
    null,
  );
  // An operator whose value no longer fits (relative → a date) waits here until
  // the user picks a new value; cancelling leaves the chip untouched.
  const [pendingOp, setPendingOp] = React.useState<FilterOperator | null>(null);

  const operator = pendingOp ?? rule.operator;
  const base = pendingOp ? changeOperator(rule, pendingOp) : rule;
  const valueText = formatRuleValue(rule, field);
  const operatorLabel =
    OPERATORS[field.type].find((o) => o.value === rule.operator)?.label ?? "";
  const summary = describeRule(rule, fields);

  function pickOperator(op: FilterOperator) {
    setEditing(null);
    if (op === rule.operator) return;
    const next = changeOperator(rule, op);
    if (isRuleComplete(next)) {
      onChange(next);
    } else {
      setPendingOp(op);
      setEditing("value");
    }
  }

  return (
    <div
      role="group"
      aria-label={`${summary} filter`}
      className="inline-flex h-7 max-w-full items-stretch border bg-muted/40 text-xs"
    >
      <span className="flex items-center px-2 text-muted-foreground">
        {field.label}
      </span>

      <Popover
        open={editing === "operator"}
        onOpenChange={(o) => setEditing(o ? "operator" : null)}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${field.label} operator: ${operatorLabel}. Change`}
            className={cn(SEGMENT, "border-l text-muted-foreground")}
          >
            {OPERATOR_SYMBOLS[rule.operator]}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          style={{ ...PANEL_STYLE, width: "14rem" }}
        >
          <OptionList
            ariaLabel={`${field.label} operator`}
            options={OPERATORS[field.type]}
            value={rule.operator}
            onSelect={(op) => pickOperator(op as FilterOperator)}
          />
        </PopoverContent>
      </Popover>

      <Popover
        open={editing === "value"}
        onOpenChange={(o) => {
          setEditing(o ? "value" : null);
          if (!o) setPendingOp(null);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${field.label} value: ${valueText}. Change`}
            title={valueText.length > 28 ? valueText : undefined}
            className={cn(SEGMENT, "min-w-0 border-l font-medium")}
          >
            <span className="max-w-56 truncate">{valueText}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" style={PANEL_STYLE}>
          <ValueStep
            field={field}
            operator={operator}
            value={base.value}
            valueTo={base.valueTo}
            onSubmit={(value, valueTo) => {
              onChange({
                ...rule,
                operator,
                value,
                valueTo: operator === "between" ? valueTo : undefined,
              });
              setEditing(null);
              setPendingOp(null);
            }}
          />
        </PopoverContent>
      </Popover>

      <button
        type="button"
        aria-label={`Remove filter: ${summary}`}
        onClick={onRemove}
        className={cn(
          SEGMENT,
          "border-l text-muted-foreground hover:text-foreground",
        )}
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
