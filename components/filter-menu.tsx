"use client";

import * as React from "react";
import { ChevronDown, Funnel } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DEFAULT_FILTER_FIELDS,
  type FilterField,
  type FilterRule,
} from "@/lib/deal-filter";
import {
  FilterPicker,
  PANEL_STYLE,
  usePickerStep,
} from "@/components/filter-parts";

export type FilterMenuProps = {
  /** The properties users can filter by, with real stage / owner options. */
  fields?: readonly FilterField[];
  /** The active rules. Share the same value with <FilterBar />. */
  value: FilterRule[];
  /** Fires the moment a filter is completed or cleared. */
  onValueChange: (rules: FilterRule[]) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Adds filters: Property → Operator → Value, and the filter lands in the
 * <FilterBar /> under the toolbar. The trigger carries no count; the bar is
 * where active filters live. Rules combine with AND, and this never touches the
 * saved view, search, sort, pipeline or board/list mode.
 */
export function FilterMenu({
  fields = DEFAULT_FILTER_FIELDS,
  value,
  onValueChange,
  disabled = false,
  className,
}: FilterMenuProps) {
  const [open, setOpen] = React.useState(false);
  const picker = usePickerStep();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) picker.reset();
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-filter-trigger=""
          className={cn(className)}
        >
          <Funnel aria-hidden />
          Filter
          <ChevronDown
            aria-hidden
            data-icon="inline-end"
            className="transition-transform duration-150 group-aria-expanded/button:rotate-180"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label="Add filter"
        style={PANEL_STYLE}
        onEscapeKeyDown={(e) => {
          // Escape steps back through operator / value before it closes the menu.
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
            setOpen(false);
          }}
          onClearAll={() => {
            onValueChange([]);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
