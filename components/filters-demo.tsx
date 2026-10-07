"use client";

import * as React from "react";
import { DealSearch } from "@/components/deal-search";
import { SortMenu } from "@/components/sort-menu";
import { FilterMenu } from "@/components/filter-menu";
import { FilterBar } from "@/components/filter-bar";
import { CustomizeMenu } from "@/components/customize-menu";
import {
  ViewModeSwitcher,
  type ViewMode,
} from "@/components/view-mode-switcher";
import { DEFAULT_FILTER_FIELDS, type FilterRule } from "@/lib/deal-filter";
import {
  DEFAULT_DISPLAY_FIELDS,
  resolveVisibleFields,
} from "@/lib/deal-display";
import { useDealDisplay } from "@/lib/use-deal-display";

// Real owners come from your team data; Me is resolved by the data layer.
const FIELDS = DEFAULT_FILTER_FIELDS.map((f) =>
  f.id === "owner"
    ? {
        ...f,
        options: [
          { value: "me", label: "Me" },
          { value: "aisha", label: "Aisha Khan" },
          { value: "bilal", label: "Bilal Ahmed" },
          { value: "sara", label: "Sara Malik" },
        ],
      }
    : f,
);

/** Demo only: the toolbar, the applied-filter row, and what Customize currently shows. */
export function FiltersDemo() {
  const [rules, setRules] = React.useState<FilterRule[]>([]);
  const [mode, setMode] = React.useState<ViewMode>("list");
  const [display, setDisplay] = useDealDisplay();
  const visible = resolveVisibleFields(display, mode);

  return (
    <div className="flex w-[760px] max-w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <DealSearch className="w-56" />
        <SortMenu recordCount={86} />
        <FilterMenu fields={FIELDS} value={rules} onValueChange={setRules} />
        <ViewModeSwitcher value={mode} onValueChange={setMode} />
        <CustomizeMenu mode={mode} value={display} onValueChange={setDisplay} />
      </div>
      <FilterBar fields={FIELDS} value={rules} onValueChange={setRules} />
      <p className="text-xs text-muted-foreground">
        {mode === "list" ? "List columns" : "Board card fields"}:{" "}
        {visible
          .map((id) => DEFAULT_DISPLAY_FIELDS.find((f) => f.id === id)?.label)
          .join(", ")}
      </p>
    </div>
  );
}
