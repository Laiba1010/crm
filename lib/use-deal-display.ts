"use client";

import * as React from "react";
import {
  DEFAULT_DISPLAY_CONFIG,
  DEFAULT_DISPLAY_FIELDS,
  normalizeDisplayConfig,
  type DisplayConfig,
  type DisplayField,
} from "@/lib/deal-display";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb); // another tab changed it
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

/**
 * Customize preference for one user, remembered across sessions and shared by
 * every saved view and pipeline. Stored in this browser; swap the two storage
 * lines for your user-preferences API to make it follow the user across devices.
 * Server render and first paint use the defaults, so hydration always matches.
 */
export function useDealDisplay(
  userId = "me",
  catalog: readonly DisplayField[] = DEFAULT_DISPLAY_FIELDS,
): [DisplayConfig, (next: DisplayConfig) => void] {
  const key = `deals.display.v1.${userId}`;

  const raw = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null; // storage blocked: behave as defaults, still usable
      }
    },
    () => null,
  );

  const config = React.useMemo(() => {
    if (!raw) return DEFAULT_DISPLAY_CONFIG;
    try {
      return normalizeDisplayConfig(JSON.parse(raw), catalog);
    } catch {
      return DEFAULT_DISPLAY_CONFIG;
    }
  }, [raw, catalog]);

  const setConfig = React.useCallback(
    (next: DisplayConfig) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage blocked: the change just won't persist */
      }
      listeners.forEach((l) => l());
    },
    [key],
  );

  return [config, setConfig];
}
