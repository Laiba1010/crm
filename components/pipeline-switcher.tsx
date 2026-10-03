"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, GitBranch, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

export type Pipeline = {
  id: string;
  name: string;
  /** Optional. Group headings only render when at least one pipeline sets this. */
  group?: "standard" | "custom";
};

export type PipelineSwitcherProps = {
  pipelines: Pipeline[];
  /** Controlled selected pipeline id. Omit to let the component manage it. */
  value?: string;
  /** Uncontrolled initial id. Falls back to the first pipeline. */
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Data not ready: list body shows skeleton rows, trigger stays interactive. */
  loading?: boolean;
  /** Footer destination. Serializable, so it works from a Server Component. */
  manageHref?: string;
  /** Footer callback for client parents. Runs after the popover closes. */
  onManage?: () => void;
  className?: string;
};

const SEARCH_DEBOUNCE_MS = 150;
const GROUP_LABELS = { standard: "Standard", custom: "Custom" } as const;

function matches(pipeline: Pipeline, query: string) {
  const q = query.trim().toLowerCase();
  return q === "" || pipeline.name.toLowerCase().includes(q);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const start = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (start === -1) return <>{text}</>;
  const end = start + q.length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-primary/15 font-medium text-foreground">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

function SkeletonRows() {
  return (
    <div aria-hidden className="flex flex-col gap-1 p-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex h-8 items-center px-2">
          <div
            className="h-3 animate-pulse bg-muted"
            style={{ width: `${70 - i * 15}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function PipelineSwitcher({
  pipelines,
  value: valueProp,
  defaultValue,
  onValueChange,
  loading = false,
  manageHref,
  onManage,
  className,
}: PipelineSwitcherProps) {
  const router = useRouter();
  const [internal, setInternal] = React.useState(
    defaultValue ?? pipelines[0]?.id ?? "",
  );
  const value = valueProp ?? internal;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [highlighted, setHighlighted] = React.useState(value);
  const [prevDebounced, setPrevDebounced] = React.useState(debounced);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Ref to detect text truncation dynamically
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  const current = pipelines.find((p) => p.id === value);
  const filtered = React.useMemo(
    () => pipelines.filter((p) => matches(p, debounced)),
    [pipelines, debounced],
  );

  if (prevDebounced !== debounced) {
    setPrevDebounced(debounced);
    setHighlighted(filtered[0]?.id ?? "");
  }

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const disabled = !loading && pipelines.length <= 1;
  const label = current?.name ?? (loading ? "Loading…" : "Select pipeline");

  const checkTruncation = () => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  };

  if (disabled) {
    const reason =
      pipelines.length === 0
        ? "No pipelines available."
        : "Only one pipeline available.";
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-disabled="true"
              tabIndex={-1}
              className={cn(
                "w-52 justify-between cursor-not-allowed opacity-50 hover:bg-background",
                className,
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{label}</span>
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            {reason}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setQuery("");
    setDebounced("");
    setPrevDebounced("");
    setHighlighted(value);
  }

  function select(id: string) {
    setInternal(id);
    onValueChange?.(id);
    setOpen(false);
  }

  const hasGroups = pipelines.some((p) => p.group);
  const sections = hasGroups
    ? (["standard", "custom"] as const)
        .map((g) => ({
          key: g,
          items: filtered.filter((p) => (p.group ?? "custom") === g),
        }))
        .filter((s) => s.items.length > 0)
    : [{ key: "all" as const, items: filtered }];

  const renderItem = (p: Pipeline) => (
    <CommandItem
      key={p.id}
      value={p.id}
      data-checked={p.id === value}
      onSelect={() => select(p.id)}
    >
      <span className="min-w-0 truncate">
        <Highlight text={p.name} query={debounced} />
      </span>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip open={isTruncated && !open ? undefined : false}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-label={`Pipeline: ${label}`}
                onMouseEnter={checkTruncation}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    handleOpenChange(true);
                  }
                }}
                className={cn("w-52 justify-between gap-2", className)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
                  <span ref={textRef} className="min-w-0 truncate">
                    {label}
                  </span>
                </div>
                <ChevronDown
                  aria-hidden
                  className="h-4 w-4 shrink-0 transition-transform duration-150 group-aria-expanded/button:rotate-180"
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-(--radix-popover-trigger-width) gap-0 p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <Command
          shouldFilter={false}
          value={highlighted}
          onValueChange={setHighlighted}
          loop
        >
          <CommandInput
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Search pipelines…"
            aria-label="Search pipelines"
          />
          <CommandList className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-6rem))]">
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <div
                role="status"
                className="py-6 text-center text-xs text-muted-foreground"
              >
                No pipelines found.
              </div>
            ) : (
              sections.map((s) =>
                s.key === "all" ? (
                  <CommandGroup key="all">
                    {s.items.map(renderItem)}
                  </CommandGroup>
                ) : (
                  <CommandGroup key={s.key} heading={GROUP_LABELS[s.key]}>
                    {s.items.map(renderItem)}
                  </CommandGroup>
                ),
              )
            )}
          </CommandList>
        </Command>

        <div className="border-t p-1">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-xs font-normal"
            onClick={() => {
              setOpen(false);
              onManage?.();
              if (manageHref) router.push(manageHref);
            }}
          >
            <Settings2 aria-hidden className="mr-2 h-3.5 w-3.5" />
            Manage pipelines
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
