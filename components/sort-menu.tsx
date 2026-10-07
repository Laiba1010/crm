"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronDown,
  CircleDollarSign,
  RefreshCw,
  Type,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DIRECTION_OPTIONS,
  SORT_FALLBACK_NOTICE,
  SORT_FIELDS,
  SORT_FIELD_ORDER,
  describeSort,
  normalizeSort,
  sortFellBack,
  type DealSort,
  type DealSortField,
  type SortDirection,
} from "@/lib/deal-sort";

const FIELD_ICONS: Record<
  DealSortField,
  React.ComponentType<{ className?: string }>
> = {
  closeDate: CalendarClock,
  amount: CircleDollarSign,
  name: Type,
  createdAt: CalendarPlus,
  updatedAt: RefreshCw,
  owner: User,
};

export type SortMenuProps = {
  /** Controlled sort. `null` means no user-applied sort. Omit to let the component manage it. */
  value?: DealSort;
  /** Uncontrolled initial sort. */
  defaultValue?: DealSort;
  onValueChange?: (sort: DealSort) => void;
  /**
   * Fields offered in the list. A sort on any other field (e.g. a saved view
   * pointing at a removed column) falls back to Updated Date, newest first.
   */
  fields?: readonly DealSortField[];
  /** Deals are being fetched. Disables the button. */
  loading?: boolean;
  /** Deals in the current dataset. 0 or 1 disables the button: nothing to order. */
  recordCount?: number;
  /** Force-disable. The button stays focusable and says why on hover. */
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
};

/**
 * Order of the deals already in play. It never changes which deals those are,
 * and it leaves saved view, search, filters, pipeline and board/list alone.
 * Ordering itself lives in `sortDeals` (lib/deal-sort.ts): List orders the whole
 * dataset, Board orders the cards inside each column.
 *
 * Changes apply instantly; there is no Apply button.
 */
export function SortMenu({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  fields = SORT_FIELD_ORDER,
  loading = false,
  recordCount,
  disabled: disabledProp = false,
  disabledReason,
  className,
}: SortMenuProps) {
  const [internal, setInternal] = React.useState<DealSort>(defaultValue);
  const [open, setOpen] = React.useState(false);
  const rows = React.useRef(new Map<string, HTMLButtonElement>());

  // `valueProp === undefined` means uncontrolled; an explicit null is a controlled "no sort".
  const raw = valueProp === undefined ? internal : valueProp;
  const sort = normalizeSort(raw, fields);
  const fellBack = sortFellBack(raw, fields);
  const offered = SORT_FIELD_ORDER.filter((f) => fields.includes(f));
  const kind = sort ? SORT_FIELDS[sort.field].kind : null;
  const directions = kind ? DIRECTION_OPTIONS[kind] : [];

  const tooFew = recordCount !== undefined && recordCount <= 1;
  const disabled = disabledProp || loading || tooFew;
  const reason =
    disabledReason ??
    (loading
      ? "Loading deals…"
      : tooFew
        ? "Not enough deals to sort."
        : "Sorting isn't available here.");

  function apply(next: DealSort) {
    setInternal(next);
    onValueChange?.(next);
  }

  function pickField(field: DealSortField) {
    if (field === sort?.field) return;
    // Direction wording differs per field, so a new field starts at its own default.
    apply({ field, direction: SORT_FIELDS[field].defaultDirection });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Non-blocking, and `id` keeps repeated opens from stacking toasts.
    if (next && fellBack)
      toast.warning(SORT_FALLBACK_NOTICE, { id: "sort-fallback" });
  }

  // One vertical flow through fields, then direction. A single tab stop: the
  // selected field (else the first); arrows do the rest.
  const order = [
    ...offered.map((f) => `field:${f}`),
    ...directions.map((d) => `dir:${d.value}`),
  ];
  const tabStop = `field:${sort?.field ?? offered[0]}`;

  function onListKeyDown(e: React.KeyboardEvent) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const current = order.findIndex(
      (k) => rows.current.get(k) === document.activeElement,
    );
    const last = order.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowDown"
            ? Math.min(current + 1, last)
            : Math.max(current - 1, 0);
    rows.current.get(order[next])?.focus();
  }

  const register = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) rows.current.set(key, el);
    else rows.current.delete(key);
  };

  const rowClass =
    "flex h-8 w-full items-center gap-2 px-2 text-left text-xs outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-inset";

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-disabled="true"
              onClick={(e) => e.preventDefault()}
              className={cn(
                "cursor-not-allowed opacity-50 hover:bg-background",
                className,
              )}
            >
              <ArrowUpDown aria-hidden />
              Sort
              <ChevronDown aria-hidden data-icon="inline-end" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{reason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const DirectionIcon = sort?.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={sort ? `Sort: ${describeSort(sort)}` : "Sort"}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              handleOpenChange(true);
            }
          }}
          className={cn(
            // Active: primary-tinted border and fill, so a modified dataset is obvious.
            sort &&
              "border-primary/50 bg-primary/5 text-foreground dark:border-primary/50 dark:bg-primary/10",
            className,
          )}
        >
          <ArrowUpDown aria-hidden />
          {sort ? (
            <span className="max-w-48 truncate">
              Sort: {SORT_FIELDS[sort.field].label}
            </span>
          ) : (
            "Sort"
          )}
          {sort ? (
            <DirectionIcon aria-hidden data-icon="inline-end" />
          ) : (
            <ChevronDown
              aria-hidden
              data-icon="inline-end"
              className="transition-transform duration-150 group-aria-expanded/button:rotate-180"
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        // Inline, because the shared popover's own width/padding/gap have no merge step.
        style={{ width: "15rem", padding: 0, gap: 0 }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          rows.current.get(tabStop)?.focus();
        }}
      >
        <div onKeyDown={onListKeyDown}>
          {/* 1. Field */}
          <div
            className="px-3 pt-2.5 pb-1 text-xs text-muted-foreground"
            id="sort-by-label"
          >
            Sort by
          </div>
          <div
            role="radiogroup"
            aria-labelledby="sort-by-label"
            className="p-1 pt-0"
          >
            {offered.map((field) => {
              const Icon = FIELD_ICONS[field];
              const selected = sort?.field === field;
              const key = `field:${field}`;
              return (
                <button
                  key={field}
                  ref={register(key)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={key === tabStop ? 0 : -1}
                  onClick={() => pickField(field)}
                  className={cn(
                    rowClass,
                    selected
                      ? "font-medium text-foreground"
                      : "text-foreground/90",
                  )}
                >
                  <Icon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {SORT_FIELDS[field].label}
                  </span>
                  {selected && (
                    <Check aria-hidden className="size-4 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 2. Direction, only once a field is selected */}
          {sort && (
            <div className="border-t">
              <div
                className="px-3 pt-2.5 pb-1 text-xs text-muted-foreground"
                id="sort-direction-label"
              >
                Direction
              </div>
              <div
                role="radiogroup"
                aria-labelledby="sort-direction-label"
                className="p-1 pt-0"
              >
                {directions.map((d) => {
                  const selected = sort.direction === d.value;
                  return (
                    <button
                      key={d.value}
                      ref={register(`dir:${d.value}`)}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={-1}
                      onClick={() =>
                        apply({
                          field: sort.field,
                          direction: d.value as SortDirection,
                        })
                      }
                      className={cn(
                        rowClass,
                        selected
                          ? "font-medium text-foreground"
                          : "text-foreground/90",
                      )}
                    >
                      <span
                        aria-hidden
                        className="flex size-4 shrink-0 items-center justify-center"
                      >
                        <span className="flex size-3.5 items-center justify-center rounded-full border border-input">
                          {selected && (
                            <span className="size-1.5 rounded-full bg-primary" />
                          )}
                        </span>
                      </span>
                      <span aria-hidden>{d.label}</span>
                      <span className="sr-only">{d.spoken}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Footer, only while a sort is active */}
        {sort && (
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => {
                apply(null);
                setOpen(false);
              }}
              className={cn(
                rowClass,
                "text-muted-foreground hover:text-foreground",
              )}
            >
              <X aria-hidden className="size-4 shrink-0" />
              Clear sort
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
