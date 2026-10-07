"use client";

import * as React from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export type DealSearchProps = {
  /** Controlled committed query (e.g. the URL param). Omit to let the component manage it. */
  value?: string;
  /** Uncontrolled initial query. */
  defaultValue?: string;
  /**
   * Fires with the trimmed query once typing settles, on Enter, and immediately
   * on clear. Not fired while an IME composition is in progress.
   */
  onValueChange?: (query: string) => void;
  /** Delay before a typed query is committed. Use 0 for local, in-memory filtering. */
  debounceMs?: number;
  /**
   * Results for the committed query are on their way. Only the leading icon
   * changes; the layout and the current results stay put.
   */
  loading?: boolean;
  /** Matches for the committed query. Only used for the screen-reader announcement. */
  resultCount?: number;
  placeholder?: string;
  className?: string;
};

/**
 * Finds a deal by identity (deal, company or contact name). It only reports a
 * query: scoping it to the active pipeline, saved view and filters is the
 * parent's job, and it never resets any of them. Clearing it returns to the
 * previous context.
 */
export function DealSearch({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  debounceMs = 250,
  loading = false,
  resultCount,
  placeholder = "Search deals…",
  className,
}: DealSearchProps) {
  const [internal, setInternal] = React.useState(defaultValue.trim());
  const committed = valueProp ?? internal;

  // What the input shows. It runs ahead of `committed` while the user types.
  const [draft, setDraft] = React.useState(committed);
  const [prevCommitted, setPrevCommitted] = React.useState(committed);
  if (prevCommitted !== committed) {
    setPrevCommitted(committed);
    // External change (reset, back button): follow it, but never fight typing.
    if (committed !== draft.trim()) setDraft(committed);
  }

  const inputRef = React.useRef<HTMLInputElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const composing = React.useRef(false);
  const lastCommitted = React.useRef(committed);

  React.useEffect(() => {
    lastCommitted.current = committed;
  }, [committed]);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  function commit(text: string) {
    clearTimeout(timer.current);
    const query = text.trim();
    if (query === lastCommitted.current) return;
    lastCommitted.current = query;
    setInternal(query);
    onValueChange?.(query);
  }

  function schedule(text: string) {
    clearTimeout(timer.current);
    if (text.trim() === "" || debounceMs <= 0) return commit(text);
    timer.current = setTimeout(() => commit(text), debounceMs);
  }

  function clear() {
    setDraft("");
    commit("");
    inputRef.current?.focus();
  }

  const hasText = draft !== "";
  const announcement =
    committed && !loading && resultCount !== undefined
      ? resultCount === 0
        ? "No deals found"
        : `${resultCount.toLocaleString("en-US")} matching ${resultCount === 1 ? "deal" : "deals"}`
      : "";

  return (
    <div role="search" className={cn("min-w-0", className)}>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          {loading ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <Search aria-hidden />
          )}
        </InputGroupAddon>

        <InputGroupInput
          ref={inputRef}
          role="searchbox"
          value={draft}
          placeholder={placeholder}
          aria-label="Search deals"
          aria-busy={loading || undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          enterKeyHint="search"
          onChange={(e) => {
            setDraft(e.target.value);
            if (!composing.current) schedule(e.target.value);
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={(e) => {
            composing.current = false;
            schedule(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              commit(draft);
            } else if (e.key === "Escape") {
              if (hasText) {
                // Keep the Escape from also closing a drawer or dialog behind us.
                e.preventDefault();
                e.stopPropagation();
                clear();
              } else {
                inputRef.current?.blur();
              }
            }
          }}
        />

        {hasText && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              onClick={clear}
            >
              <X aria-hidden />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

export type DealSearchEmptyProps = {
  /**
   * Optional escape hatch for when the current view/pipeline has no match.
   * Leave it out and nothing but the message renders.
   */
  onSearchAll?: () => void;
  className?: string;
};

/**
 * Results area for a search with no matches. Drop it in place of the Board/List
 * body so the header and toolbar stay where they are. The match announcement
 * already comes from DealSearch, so this stays silent for screen readers.
 */
export function DealSearchEmpty({
  onSearchAll,
  className,
}: DealSearchEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 px-4 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">No deals found</p>
      <p className="text-xs text-muted-foreground">
        Try a different search term.
      </p>
      {onSearchAll && (
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onSearchAll}
          className="mt-1"
        >
          Search all deals
        </Button>
      )}
    </div>
  );
}
