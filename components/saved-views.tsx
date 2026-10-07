"use client";

import * as React from "react";
import {
  ChevronDown,
  Copy,
  Ellipsis,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SavedView = {
  id: string;
  name: string;
  /** System views are protected: no ⋯ menu, never swapped into overflow. */
  kind: "system" | "custom";
  /** Records matching this view right now. Leave undefined while it loads. */
  count?: number;
};

export type SavedViewAction = "edit" | "duplicate" | "share" | "delete";

export type SavedViewsProps = {
  views: SavedView[];
  /** Controlled active view id. Omit to let the component manage it. */
  value?: string;
  /** Uncontrolled initial id. Falls back to the first view. */
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /**
   * A custom view's ⋯ menu action. Delete is not confirmed here: confirm in the
   * parent. After an action, focus is yours to place (e.g. into your dialog).
   */
  onManage?: (action: SavedViewAction, view: SavedView) => void;
  /** The + button. Opens the separate create-saved-view flow. */
  onAdd?: () => void;
  /** Views not ready: skeleton tabs, + stays usable. */
  loading?: boolean;
  className?: string;
};

type Metrics = { available: number; widths: Record<string, number> };

const GAP = 4; // gap-1, keep in sync with the row's gap class

/* ----------------------------------------------------------------------------
 * Overflow
 * ------------------------------------------------------------------------- */

/**
 * Which views stay in the strip. System views and the active view are always
 * pinned; remaining custom views fill the leftover width in their original
 * order. So a view picked from "More" takes the slot of the last visible
 * custom tab, and the active view never hides inside the dropdown.
 */
function splitViews(
  views: SavedView[],
  activeId: string,
  m: Metrics | null,
): { visible: SavedView[]; hidden: SavedView[] } {
  if (!m) return { visible: views, hidden: [] };
  const w = (key: string) => m.widths[key] ?? 0;

  const all =
    views.reduce((sum, v) => sum + w(`view:${v.id}`), 0) +
    GAP * Math.max(views.length - 1, 0);
  if (all + GAP + w("add") <= m.available)
    return { visible: views, hidden: [] };

  let budget = m.available - w("add") - GAP - w("more") - GAP;
  const keep = new Set<string>();

  for (const v of views) {
    if (v.kind === "system" || v.id === activeId) {
      keep.add(v.id);
      budget -= w(`view:${v.id}`) + GAP;
    }
  }
  for (const v of views) {
    if (keep.has(v.id)) continue;
    const cost = w(`view:${v.id}`) + GAP;
    if (cost > budget) break; // stop at the first miss so hidden views stay contiguous
    keep.add(v.id);
    budget -= cost;
  }

  return {
    visible: views.filter((v) => keep.has(v.id)),
    hidden: views.filter((v) => !keep.has(v.id)),
  };
}

function sameMetrics(a: Metrics | null, b: Metrics) {
  if (!a || a.available !== b.available) return false;
  const keys = Object.keys(b.widths);
  return (
    keys.length === Object.keys(a.widths).length &&
    keys.every((k) => a.widths[k] === b.widths[k])
  );
}

/* ----------------------------------------------------------------------------
 * Count
 * ------------------------------------------------------------------------- */

const dealsLabel = (n: number) =>
  `${n.toLocaleString("en-US")} ${n === 1 ? "deal" : "deals"}`;

/**
 * The number is visual only. The deals phrase sits inside the parent control's
 * accessible name, so a screen reader says "My Open Deals, 24 deals" instead of
 * two stitched fragments.
 */
function CountText({ count }: { count?: number }) {
  if (count === undefined) {
    return <span aria-hidden className="h-3 w-4 animate-pulse bg-muted" />;
  }
  return (
    <>
      <span aria-hidden>{count.toLocaleString("en-US")}</span>
      <span className="sr-only">, {dealsLabel(count)}</span>
    </>
  );
}

/* ----------------------------------------------------------------------------
 * One tab (system or custom)
 * ------------------------------------------------------------------------- */

type TabMenu = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Right-click / Shift+F10 / ContextMenu key: focus returns to the tab. */
  onOpenFromTab: () => void;
  onAction: (action: SavedViewAction) => void;
  onCloseAutoFocus: (e: Event) => void;
};

type ViewTabProps = {
  view: SavedView;
  active: boolean;
  /** Set only on the hidden measuring copy. */
  measureKey?: string;
  onSelect?: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  menu?: TabMenu;
};

function ViewTab({
  view,
  active,
  measureKey,
  onSelect,
  buttonRef,
  menu,
}: ViewTabProps) {
  const custom = view.kind === "custom";

  return (
    <li
      data-measure={measureKey}
      className="group/tab relative flex min-w-0 shrink items-center"
    >
      <button
        ref={buttonRef}
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={onSelect}
        onContextMenu={
          custom && menu
            ? (e) => {
                e.preventDefault();
                menu.onOpenFromTab();
              }
            : undefined
        }
        onKeyDown={
          custom && menu
            ? (e) => {
                if (
                  (e.shiftKey && e.key === "F10") ||
                  e.key === "ContextMenu"
                ) {
                  e.preventDefault();
                  menu.onOpenFromTab();
                }
              }
            : undefined
        }
        className={cn(
          // Same weight in every state: the active tab must not change width.
          "inline-flex h-7 min-w-0 items-center gap-1.5 border pl-2.5 text-xs font-medium whitespace-nowrap outline-none select-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
          custom ? "pr-1 [@media(hover:none)]:pr-7" : "pr-2.5",
          active
            ? "border-border bg-muted text-foreground"
            : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <span className="max-w-56 min-w-0 truncate">{view.name}</span>
        <span
          className={cn(
            "flex shrink-0 justify-end text-[11px] tabular-nums transition-opacity",
            active ? "text-foreground/70" : "text-muted-foreground/80",
            // On hover/keyboard focus the ⋯ takes over the count's slot, so
            // revealing it never moves the tabs next to it.
            custom &&
              "min-w-5 group-hover/tab:opacity-0 group-has-[:focus-visible]/tab:opacity-0 group-has-[[aria-expanded=true]]/tab:opacity-0 [@media(hover:none)]:min-w-0 [@media(hover:none)]:group-hover/tab:opacity-100",
          )}
        >
          <CountText count={view.count} />
        </span>
      </button>

      {custom && menu && (
        <DropdownMenu open={menu.open} onOpenChange={menu.onOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Manage ${view.name}`}
              className={cn(
                "absolute top-0.5 right-0.5 text-muted-foreground opacity-0",
                "group-hover/tab:opacity-100 group-has-[:focus-visible]/tab:opacity-100 aria-expanded:opacity-100",
                // Touch has no hover: always visible (the tab reserves room for it).
                "[@media(hover:none)]:opacity-100",
              )}
            >
              <Ellipsis aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            style={{ width: "12rem" }}
            onCloseAutoFocus={menu.onCloseAutoFocus}
          >
            <DropdownMenuLabel className="truncate">
              {view.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => menu.onAction("edit")}>
              <Pencil aria-hidden />
              Edit view
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => menu.onAction("duplicate")}>
              <Copy aria-hidden />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => menu.onAction("share")}>
              <Share2 aria-hidden />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => menu.onAction("delete")}
            >
              <Trash2 aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

/* ----------------------------------------------------------------------------
 * Faces shared by the real controls and the hidden measuring copy
 * ------------------------------------------------------------------------- */

const MORE_CLASS = "text-muted-foreground";
const ADD_CLASS = "text-muted-foreground";

function MoreFace() {
  return (
    <>
      More
      <ChevronDown
        aria-hidden
        data-icon="inline-end"
        className="transition-transform duration-150 group-aria-expanded/button:rotate-180"
      />
    </>
  );
}

/* ----------------------------------------------------------------------------
 * Saved Views
 * ------------------------------------------------------------------------- */

/**
 * The saved-view strip of the Deals header. It only chooses which saved view is
 * active. Search, sort, filter, customize, board/list and pipeline stay with
 * their own components and are not touched here.
 */
export function SavedViews({
  views,
  value: valueProp,
  defaultValue,
  onValueChange,
  onManage,
  onAdd,
  loading = false,
  className,
}: SavedViewsProps) {
  const [internal, setInternal] = React.useState(
    defaultValue ?? views[0]?.id ?? "",
  );
  const requested = valueProp ?? internal;
  // A deleted or unknown id must not leave the strip with nothing active.
  const activeId = views.some((v) => v.id === requested)
    ? requested
    : (views[0]?.id ?? "");

  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const navRef = React.useRef<HTMLElement>(null);
  const measureRef = React.useRef<HTMLUListElement>(null);
  const tabRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const menuOrigin = React.useRef<"trigger" | "tab">("trigger");
  const actionTaken = React.useRef(false);
  const focusAfterSelect = React.useRef<string | null>(null);
  const [metrics, setMetrics] = React.useState<Metrics | null>(null);

  // Measure the full set off-screen, so overflow never depends on what is
  // currently rendered in the strip.
  React.useEffect(() => {
    const nav = navRef.current;
    const measurer = measureRef.current;
    if (!nav || !measurer) return;

    const read = () => {
      const widths: Record<string, number> = {};
      measurer.querySelectorAll<HTMLElement>("[data-measure]").forEach((el) => {
        widths[el.dataset.measure!] = el.offsetWidth;
      });
      const next = { available: nav.clientWidth, widths };
      setMetrics((prev) => (sameMetrics(prev, next) ? prev : next));
    };

    const ro = new ResizeObserver(read);
    ro.observe(nav);
    ro.observe(measurer);
    return () => ro.disconnect();
  }, []);

  const { visible, hidden } = React.useMemo(
    () => splitViews(views, activeId, metrics),
    [views, activeId, metrics],
  );

  const focusTab = React.useCallback((id: string) => {
    requestAnimationFrame(() => tabRefs.current.get(id)?.focus());
  }, []);

  function select(id: string) {
    if (id === activeId) return;
    setInternal(id);
    onValueChange?.(id);
  }

  function openMenu(id: string, origin: "trigger" | "tab") {
    menuOrigin.current = origin;
    actionTaken.current = false;
    setMenuFor(id);
  }

  function menuFor_(view: SavedView): TabMenu {
    return {
      open: menuFor === view.id,
      onOpenChange: (open) => {
        if (open) {
          openMenu(view.id, "trigger");
        } else {
          setMenuFor(null);
        }
      },
      onOpenFromTab: () => openMenu(view.id, "tab"),
      onAction: (action) => {
        actionTaken.current = true;
        onManage?.(action, view);
      },
      onCloseAutoFocus: (e) => {
        // Opened from the tab (right-click, Shift+F10): give focus back to the
        // tab, not the hidden ⋯. After an action the parent owns focus.
        if (actionTaken.current) {
          e.preventDefault();
        } else if (menuOrigin.current === "tab") {
          e.preventDefault();
          focusTab(view.id);
        }
        menuOrigin.current = "trigger";
        actionTaken.current = false;
      },
    };
  }

  return (
    <TooltipProvider>
      <nav
        ref={navRef}
        aria-label="Saved views"
        aria-busy={loading || undefined}
        className={cn("relative w-full min-w-0", className)}
      >
        {/* Hidden measuring copy of every control. Not focusable, not announced. */}
        <ul
          ref={measureRef}
          inert
          aria-hidden
          className="pointer-events-none invisible fixed top-0 left-0 flex h-0 w-max items-center gap-1 overflow-hidden"
        >
          {views.map((v) => (
            <ViewTab
              key={v.id}
              view={v}
              active={false}
              measureKey={`view:${v.id}`}
            />
          ))}
          <li data-measure="more" className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              tabIndex={-1}
              className={MORE_CLASS}
            >
              <MoreFace />
            </Button>
          </li>
          <li data-measure="add" className="shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              tabIndex={-1}
              className={ADD_CLASS}
            >
              <Plus aria-hidden />
            </Button>
          </li>
        </ul>

        {/* Hidden until measured, so the first paint never shows a wrong split. */}
        <ul className={cn("flex items-center gap-1", !metrics && "invisible")}>
          {loading
            ? [0, 1, 2].map((i) => (
                <li key={i} aria-hidden className="shrink-0">
                  <div
                    className="h-7 animate-pulse bg-muted"
                    style={{ width: `${6 - i}rem` }}
                  />
                </li>
              ))
            : visible.map((v) => (
                <ViewTab
                  key={v.id}
                  view={v}
                  active={v.id === activeId}
                  onSelect={() => select(v.id)}
                  buttonRef={(el) => {
                    if (el) tabRefs.current.set(v.id, el);
                    else tabRefs.current.delete(v.id);
                  }}
                  menu={v.kind === "custom" ? menuFor_(v) : undefined}
                />
              ))}

          {!loading && hidden.length > 0 && (
            <li className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`More views, ${hidden.length} hidden`}
                    className={MORE_CLASS}
                  >
                    <MoreFace />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  style={{ width: "14rem" }}
                  onCloseAutoFocus={(e) => {
                    // The picked view now sits in the strip: focus it, not "More".
                    const id = focusAfterSelect.current;
                    focusAfterSelect.current = null;
                    if (id) {
                      e.preventDefault();
                      focusTab(id);
                    }
                  }}
                >
                  <DropdownMenuLabel>More views</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hidden.map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      onSelect={() => {
                        focusAfterSelect.current = v.id;
                        select(v.id);
                      }}
                    >
                      <span className="min-w-0 truncate">{v.name}</span>
                      <span className="ml-auto flex shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        <CountText count={v.count} />
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )}

          <li className="shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Create saved view"
                  onClick={onAdd}
                  className={ADD_CLASS}
                >
                  <Plus aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">New view</TooltipContent>
            </Tooltip>
          </li>
        </ul>
      </nav>
    </TooltipProvider>
  );
}
