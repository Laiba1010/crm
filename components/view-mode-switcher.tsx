"use client";

import * as React from "react";
import { Kanban, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ViewMode = "board" | "list";

const MODES = [
  { value: "board", label: "Board", icon: Kanban },
  { value: "list", label: "List", icon: List },
] as const satisfies readonly {
  value: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[];

export type ViewModeSwitcherProps = {
  /** Controlled mode. Omit to let the component manage it. */
  value?: ViewMode;
  /** Uncontrolled initial mode. */
  defaultValue?: ViewMode;
  onValueChange?: (mode: ViewMode) => void;
  /**
   * Content is loading. The switcher deliberately looks the same, because the
   * selected option stays active while the content underneath changes.
   */
  loading?: boolean;
  /** Only for modes that genuinely cannot be used or loaded. */
  disabledModes?: ViewMode[];
  /**
   * Force icon-only. Without it, labels hide below 900px, after the rest of the
   * header has had its chance to compress.
   */
  iconOnly?: boolean;
  className?: string;
};

/**
 * Presentation mode for the current deals dataset. It never touches pipeline,
 * saved view, search, filters or sort: those live in the parent and are left alone.
 */
export function ViewModeSwitcher({
  value: valueProp,
  defaultValue = "board",
  onValueChange,
  loading = false,
  disabledModes = [],
  iconOnly = false,
  className,
}: ViewModeSwitcherProps) {
  const [internal, setInternal] = React.useState<ViewMode>(defaultValue);
  const value = valueProp ?? internal;

  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        value={value}
        aria-label="View mode"
        aria-busy={loading || undefined}
        className={className}
        onValueChange={(next) => {
          // Re-clicking the active option reports "". A segmented control can't be empty.
          if (!next) return;
          setInternal(next as ViewMode);
          onValueChange?.(next as ViewMode);
        }}
      >
        {MODES.map(({ value: mode, label, icon: Icon }) => (
          <ToggleGroupItem
            key={mode}
            value={mode}
            aria-label={label}
            disabled={disabledModes.includes(mode)}
            className="text-muted-foreground  data-[state=on]:text-foreground"
          >
            <Tooltip>
              {/* The tooltip trigger lives inside the item: on the item itself it would
                  overwrite the toggle's data-state and break the active styling. */}
              <TooltipTrigger asChild>
                <span className="-mx-2.5 flex h-full items-center gap-1.5 px-2.5">
                  <Icon aria-hidden />
                  <span
                    className={cn(iconOnly ? "sr-only" : "max-[900px]:sr-only")}
                  >
                    {label}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className={iconOnly ? undefined : "min-[901px]:hidden"}
              >
                {label}
              </TooltipContent>
            </Tooltip>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  );
}
