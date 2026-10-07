/**
 * Sort model for the Deals page: one field, one direction. Pure TypeScript, so
 * the sort menu, URL parsing and the data layer can all share it.
 *
 * List view: apply it to the whole dataset. Board view: apply it to the deals
 * inside each stage column separately; columns themselves never move.
 */

export type SortDirection = "asc" | "desc";
type SortKind = "date" | "number" | "text";

export const SORT_FIELDS = {
  closeDate: { label: "Close Date", kind: "date", defaultDirection: "desc" },
  amount: { label: "Amount", kind: "number", defaultDirection: "desc" },
  name: { label: "Deal Name", kind: "text", defaultDirection: "asc" },
  createdAt: { label: "Created Date", kind: "date", defaultDirection: "desc" },
  updatedAt: { label: "Updated Date", kind: "date", defaultDirection: "desc" },
  owner: { label: "Owner", kind: "text", defaultDirection: "asc" },
} as const satisfies Record<
  string,
  { label: string; kind: SortKind; defaultDirection: SortDirection }
>;

export type DealSortField = keyof typeof SORT_FIELDS;

/** Menu order. */
export const SORT_FIELD_ORDER: readonly DealSortField[] = [
  "closeDate",
  "amount",
  "name",
  "createdAt",
  "updatedAt",
  "owner",
];

export type DealSort = {
  field: DealSortField;
  direction: SortDirection;
} | null;

/**
 * Direction wording follows the field, never a blanket Ascending/Descending.
 * The first option of each kind is that kind's default direction.
 */
export const DIRECTION_OPTIONS: Record<
  SortKind,
  readonly { value: SortDirection; label: string; spoken: string }[]
> = {
  date: [
    { value: "desc", label: "Newest → Oldest", spoken: "Newest to oldest" },
    { value: "asc", label: "Oldest → Newest", spoken: "Oldest to newest" },
  ],
  number: [
    { value: "desc", label: "Highest → Lowest", spoken: "Highest to lowest" },
    { value: "asc", label: "Lowest → Highest", spoken: "Lowest to highest" },
  ],
  text: [
    { value: "asc", label: "A → Z", spoken: "A to Z" },
    { value: "desc", label: "Z → A", spoken: "Z to A" },
  ],
};

export function isSortField(value: unknown): value is DealSortField {
  return typeof value === "string" && Object.hasOwn(SORT_FIELDS, value);
}

/* ----------------------------------------------------------------------------
 * Missing / deprecated fields
 * ------------------------------------------------------------------------- */

/** What a saved sort on a removed or disabled field becomes. */
export const SORT_FALLBACK: NonNullable<DealSort> = {
  field: "updatedAt",
  direction: "desc",
};

export const SORT_FALLBACK_NOTICE =
  "Saved sort field is no longer available. Defaulted to Recently Updated.";

/** True when `sort` names a field that is unknown or not currently offered. */
export function sortFellBack(
  sort: { field: string; direction: string } | null | undefined,
  allowed: readonly DealSortField[] = SORT_FIELD_ORDER,
): boolean {
  return !!sort && !(isSortField(sort.field) && allowed.includes(sort.field));
}

/**
 * Anything coming from a URL or a saved view may name a field that no longer
 * exists or isn't offered. That falls back to Updated Date, newest first
 * (or to no sort at all if Updated Date isn't offered either). Never a broken
 * state. Run the data layer through this too, so it orders the same way the
 * menu displays.
 */
export function normalizeSort(
  sort: { field: string; direction: string } | null | undefined,
  allowed: readonly DealSortField[] = SORT_FIELD_ORDER,
): DealSort {
  if (!sort) return null;
  if (sortFellBack(sort, allowed)) {
    return allowed.includes(SORT_FALLBACK.field) ? { ...SORT_FALLBACK } : null;
  }
  const field = sort.field as DealSortField;
  const direction: SortDirection =
    sort.direction === "asc" || sort.direction === "desc"
      ? sort.direction
      : SORT_FIELDS[field].defaultDirection;
  return { field, direction };
}

export function describeSort(sort: NonNullable<DealSort>): string {
  const { label, kind } = SORT_FIELDS[sort.field];
  const dir = DIRECTION_OPTIONS[kind].find((d) => d.value === sort.direction)!;
  return `${label}, ${dir.spoken.toLowerCase()}`;
}

/* ----------------------------------------------------------------------------
 * Applying a sort
 * ------------------------------------------------------------------------- */

/**
 * ORDER BY plan for a server-side query: the chosen field, then the hidden
 * tie-breakers. Every entry is NULLS LAST. Map the field names to columns.
 */
export function sortToOrderBy(
  sort: DealSort,
): { field: DealSortField | "id"; direction: SortDirection; nulls: "last" }[] {
  if (!sort) return [];
  const plan: ReturnType<typeof sortToOrderBy> = [
    { field: sort.field, direction: sort.direction, nulls: "last" },
  ];
  if (sort.field !== "createdAt") {
    plan.push({ field: "createdAt", direction: "desc", nulls: "last" });
  }
  plan.push({ field: "id", direction: "asc", nulls: "last" });
  return plan;
}

type SortValue = string | number | Date | null | undefined;

/** How to read each sortable field off your deal type. */
export type DealSortAccessors<T> = Record<
  DealSortField,
  (deal: T) => SortValue
> & {
  /** Stable identity, the very last tie-breaker. */
  id: (deal: T) => string;
};

const collator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

function toKey(kind: SortKind, raw: SortValue): string | number | null {
  if (raw === null || raw === undefined) return null;
  if (kind === "text") {
    const text = String(raw).trim();
    return text === "" ? null : text;
  }
  const n =
    raw instanceof Date
      ? raw.getTime()
      : typeof raw === "string" && kind === "date"
        ? Date.parse(raw)
        : Number(raw);
  return Number.isNaN(n) ? null : n;
}

/** Compares two keys, missing values last. `sign` flips only the real comparison. */
function compareKeys(
  a: string | number | null,
  b: string | number | null,
  sign: 1 | -1,
): number {
  if (a === null || b === null) {
    return a === b ? 0 : a === null ? 1 : -1; // exactly one missing: it goes last
  }
  const cmp =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : collator.compare(String(a), String(b));
  return cmp * sign;
}

/**
 * Returns a new, ordered array; the input is not mutated.
 *
 * - NULLS LAST: missing values (null, undefined, "", invalid dates, NaN) sort
 *   at the bottom in both directions, so blanks never float above real deals.
 * - Deterministic ties: equal values fall back to Created Date (newest first),
 *   then to the deal id, then to incoming order. This is internal; it is not a
 *   second user-facing sort rule.
 * - Text compares case-insensitively with natural number order ("Deal 2" < "Deal 10").
 */
export function sortDeals<T>(
  deals: readonly T[],
  sort: DealSort,
  get: DealSortAccessors<T>,
): T[] {
  if (!sort) return deals.slice();
  const { kind } = SORT_FIELDS[sort.field];
  const sign = sort.direction === "asc" ? 1 : -1;

  return deals
    .map((deal, index) => ({
      deal,
      index,
      id: get.id(deal),
      key: toKey(kind, get[sort.field](deal)),
      created: toKey("date", get.createdAt(deal)),
    }))
    .sort(
      (a, b) =>
        compareKeys(a.key, b.key, sign) ||
        compareKeys(a.created, b.created, -1) ||
        collator.compare(a.id, b.id) ||
        a.index - b.index,
    )
    .map((row) => row.deal);
}
