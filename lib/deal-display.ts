/**
 * Customize model: which information the Deals page shows. Visibility only.
 *
 * Customize is a personal display preference, not part of a Saved View.
 * Saved Views control which deals qualify; Customize controls how those deals
 * are displayed. So this config is stored per user, once per presentation
 * mode, and is shared across every saved view, search, filter, sort and
 * pipeline. Board and List never overwrite each other.
 */

export type DealDisplayMode = "list" | "board";

export type DisplayField = {
  /** Same ids Sort and Filter use (name, amount, stage, owner, closeDate...). */
  id: string;
  label: string;
  /** Identity field: always visible, not removable (Deal Name). */
  required?: boolean;
  /**
   * Where the field can appear and whether it is on by default. A mode that is
   * left out can't show the field (e.g. Stage on Board cards: the column is the stage).
   */
  modes: Partial<Record<DealDisplayMode, { default: boolean }>>;
};

/** Catalog order is display order: toggling never moves a field. */
export const DEFAULT_DISPLAY_FIELDS: readonly DisplayField[] = [
  {
    id: "name",
    label: "Deal Name",
    required: true,
    modes: { list: { default: true }, board: { default: true } },
  },
  {
    id: "amount",
    label: "Amount",
    modes: { list: { default: true }, board: { default: true } },
  },
  { id: "stage", label: "Stage", modes: { list: { default: true } } },
  {
    id: "owner",
    label: "Owner",
    modes: { list: { default: true }, board: { default: true } },
  },
  {
    id: "closeDate",
    label: "Close Date",
    modes: { list: { default: true }, board: { default: true } },
  },
  {
    id: "probability",
    label: "Probability",
    modes: { list: { default: false }, board: { default: false } },
  },
  {
    id: "company",
    label: "Company",
    modes: { list: { default: false }, board: { default: false } },
  },
  {
    id: "contact",
    label: "Contact",
    modes: { list: { default: false }, board: { default: false } },
  },
  {
    id: "createdAt",
    label: "Created Date",
    modes: { list: { default: false }, board: { default: false } },
  },
  {
    id: "updatedAt",
    label: "Updated Date",
    modes: { list: { default: false }, board: { default: false } },
  },
];

/** Search appears in the menu only past this many fields. */
export const SEARCH_THRESHOLD = 10;

/**
 * What the user explicitly chose, per mode. Fields in neither list follow the
 * catalog default, so a field added to the catalog later shows up by its
 * default instead of being silently hidden.
 */
export type ModeConfig = { shown: string[]; hidden: string[] };
export type DisplayConfig = Record<DealDisplayMode, ModeConfig>;

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  list: { shown: [], hidden: [] },
  board: { shown: [], hidden: [] },
};

/* ----------------------------------------------------------------------------
 * Reading
 * ------------------------------------------------------------------------- */

/**
 * Fields that can appear in this mode, in catalog order. `available` limits it
 * to what the current pipeline actually has; fields outside it simply don't
 * render, and their saved setting is left alone for pipelines that do have them.
 */
export function fieldsForMode(
  catalog: readonly DisplayField[],
  mode: DealDisplayMode,
  available?: readonly string[],
): DisplayField[] {
  return catalog.filter(
    (f) =>
      f.modes[mode] && (!available || f.required || available.includes(f.id)),
  );
}

export function isFieldVisible(
  field: DisplayField,
  mode: DealDisplayMode,
  config: DisplayConfig,
): boolean {
  if (field.required) return true;
  const entry = config[mode];
  if (entry.shown.includes(field.id)) return true;
  if (entry.hidden.includes(field.id)) return false;
  return field.modes[mode]?.default ?? false;
}

/** Visible field ids for the table columns / card rows, in catalog order. */
export function resolveVisibleFields(
  config: DisplayConfig,
  mode: DealDisplayMode,
  catalog: readonly DisplayField[] = DEFAULT_DISPLAY_FIELDS,
  available?: readonly string[],
): string[] {
  return fieldsForMode(catalog, mode, available)
    .filter((f) => isFieldVisible(f, mode, config))
    .map((f) => f.id);
}

/** True when nothing in this mode differs from the catalog defaults. */
export function isModeDefault(
  config: DisplayConfig,
  mode: DealDisplayMode,
  catalog: readonly DisplayField[] = DEFAULT_DISPLAY_FIELDS,
): boolean {
  const entry = config[mode];
  const dflt = (id: string) =>
    catalog.find((f) => f.id === id)?.modes[mode]?.default ?? false;
  return (
    !entry.shown.some((id) => !dflt(id)) && !entry.hidden.some((id) => dflt(id))
  );
}

/* ----------------------------------------------------------------------------
 * Writing (each returns a new config; only the given mode changes)
 * ------------------------------------------------------------------------- */

export function setFieldVisible(
  config: DisplayConfig,
  mode: DealDisplayMode,
  fieldId: string,
  visible: boolean,
  catalog: readonly DisplayField[] = DEFAULT_DISPLAY_FIELDS,
): DisplayConfig {
  const field = catalog.find((f) => f.id === fieldId);
  if (!field || field.required || !field.modes[mode]) return config;
  const rest = (list: string[]) => list.filter((id) => id !== fieldId);
  const entry = config[mode];
  return {
    ...config,
    [mode]: visible
      ? { shown: [...rest(entry.shown), fieldId], hidden: rest(entry.hidden) }
      : { shown: rest(entry.shown), hidden: [...rest(entry.hidden), fieldId] },
  };
}

/** Reset only this mode. The other mode, and everything else on the page, is untouched. */
export function resetMode(
  config: DisplayConfig,
  mode: DealDisplayMode,
): DisplayConfig {
  return { ...config, [mode]: { shown: [], hidden: [] } };
}

/**
 * Cleans stored config: malformed data becomes defaults, ids that no longer
 * exist in the data model are dropped silently, duplicates are removed.
 * Ids that exist in the catalog but not in the current pipeline are kept.
 */
export function normalizeDisplayConfig(
  raw: unknown,
  catalog: readonly DisplayField[] = DEFAULT_DISPLAY_FIELDS,
): DisplayConfig {
  const known = new Set(catalog.map((f) => f.id));
  const clean = (value: unknown): string[] =>
    Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (v): v is string => typeof v === "string" && known.has(v),
            ),
          ),
        ]
      : [];
  const mode = (value: unknown): ModeConfig => {
    const v = (
      value && typeof value === "object" ? value : {}
    ) as Partial<ModeConfig>;
    const shown = clean(v.shown);
    return {
      shown,
      hidden: clean(v.hidden).filter((id) => !shown.includes(id)),
    };
  };
  const r = (
    raw && typeof raw === "object" ? raw : {}
  ) as Partial<DisplayConfig>;
  return { list: mode(r.list), board: mode(r.board) };
}
