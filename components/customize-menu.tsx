"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DEFAULT_DISPLAY_FIELDS,
  SEARCH_THRESHOLD,
  fieldsForMode,
  isFieldVisible,
  isModeDefault,
  resetMode,
  setFieldVisible,
  type DealDisplayMode,
  type DisplayConfig,
  type DisplayField,
} from "@/lib/deal-display";

export type CustomizeMenuProps = {
  /** The active presentation. List edits columns, Board edits card fields. */
  mode: DealDisplayMode;
  /** Stored preference (see useDealDisplay). */
  value: DisplayConfig;
  /** Fires on every toggle and on reset: changes apply instantly. */
  onValueChange: (config: DisplayConfig) => void;
  /** The fields that exist in your data model. */
  fields?: readonly DisplayField[];
  /** Fields the current pipeline has. Others aren't listed and their setting is kept. */
  availableFieldIds?: readonly string[];
  className?: string;
};

/**
 * What information is displayed. Visibility only: no ordering, presets or
 * per-field options. It is a personal display preference, not part of the
 * Saved View, and never touches which deals show, their order, the mode or the
 * pipeline. Board and List keep separate configurations.
 */
export function CustomizeMenu({
  mode,
  value,
  onValueChange,
  fields = DEFAULT_DISPLAY_FIELDS,
  availableFieldIds,
  className,
}: CustomizeMenuProps) {
  const [query, setQuery] = React.useState("");
  const rows = React.useRef(new Map<string, HTMLButtonElement>());

  const list = fieldsForMode(fields, mode, availableFieldIds);
  const searchable = list.length > SEARCH_THRESHOLD;
  const q = query.trim().toLowerCase();
  const shown = q ? list.filter((f) => f.label.toLowerCase().includes(q)) : list;
  const atDefault = isModeDefault(value, mode, fields);

  const heading = mode === "list" ? "Columns" : "Card fields";
  const rowKeys = shown.map((f) => f.id);

  function onListKeyDown(e: React.KeyboardEvent) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const current = rowKeys.findIndex((id) => rows.current.get(id) === document.activeElement);
    const last = rowKeys.length - 1;
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? last
      : e.key === "ArrowDown" ? Math.min(current + 1, last)
      : Math.max(current - 1, 0);
    rows.current.get(rowKeys[next])?.focus();
  }

  return (
    <Popover onOpenChange={(open) => open && setQuery("")}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={className}>
          <SlidersHorizontal aria-hidden />
          Customize
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        aria-label={mode === "list" ? "Customize columns" : "Customize card fields"}
        // Inline, because the shared popover's own width/padding/gap have no merge step.
        style={{ width: "16rem", padding: 0, gap: 0 }}
      >
        <div className="flex h-9 items-center px-3 text-xs font-medium" id="customize-heading">
          {heading}
        </div>

        {searchable && (
          <div className="px-3 pb-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  rows.current.get(rowKeys[0])?.focus();
                }
              }}
              placeholder="Search fields…"
              aria-label="Search fields"
              autoComplete="off"
              className="h-8 w-full min-w-0 border border-input bg-transparent px-2.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
        )}

        <div
          role="group"
          aria-labelledby="customize-heading"
          onKeyDown={onListKeyDown}
          className="max-h-[min(20rem,calc(var(--radix-popover-content-available-height)-9rem))] overflow-y-auto px-1 pb-1"
        >
          {shown.length === 0 ? (
            <p role="status" className="px-2 py-4 text-center text-xs text-muted-foreground">
              No fields found.
            </p>
          ) : (
            shown.map((field, i) => {
              const checked = isFieldVisible(field, mode, value);
              const locked = !!field.required;
              const id = `customize-${mode}-${field.id}`;
              return (
                <label
                  key={field.id}
                  htmlFor={id}
                  className="flex h-8 cursor-pointer items-center gap-2 px-2 text-xs hover:bg-muted has-[:focus-visible]:bg-muted"
                >
                  <Checkbox
                    id={id}
                    ref={(el) => {
                      if (el) rows.current.set(field.id, el);
                      else rows.current.delete(field.id);
                    }}
                    checked={checked}
                    // Locked rows stay focusable and announced; they just can't change.
                    aria-disabled={locked || undefined}
                    tabIndex={i === 0 ? 0 : -1}
                    onCheckedChange={(next) => {
                      if (locked) return;
                      onValueChange(setFieldVisible(value, mode, field.id, next === true, fields));
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">{field.label}</span>
                  {locked && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">Always shown</span>
                  )}
                </label>
              );
            })
          )}
        </div>

        <div className="border-t p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={atDefault}
            className="text-muted-foreground"
            onClick={() => {
              onValueChange(resetMode(value, mode));
              // The button disables itself now, so keep keyboard focus in the list.
              requestAnimationFrame(() => rows.current.get(rowKeys[0])?.focus());
            }}
          >
            Reset to default
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}