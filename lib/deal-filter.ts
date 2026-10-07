/**
 * Filter model for the Deals page: a flat list of rules combined with AND.
 * Pure TypeScript: the filter popover, URL parsing and the data layer share it.
 *
 * Filter answers "which deals are included". It never changes the saved view,
 * search, sort, pipeline or board/list mode.
 */

export type FilterFieldType = "select" | "text" | "number" | "date";

export type FilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "gt"
  | "lt"
  | "between"
  | "before"
  | "after"
  | "relative";

export type FilterGroup = "Deal" | "Ownership" | "Relationship" | "Other";
export const FILTER_GROUP_ORDER: readonly FilterGroup[] = [
  "Deal",
  "Ownership",
  "Relationship",
  "Other",
];

export type FilterOption = { value: string; label: string };

export type FilterField = {
  id: string;
  label: string;
  group: FilterGroup;
  type: FilterFieldType;
  /** select fields: the choices (e.g. pipeline stages, team members). */
  options?: readonly FilterOption[];
  /** number fields: shown before the input, e.g. "$". */
  prefix?: string;
};

/**
 * One condition. Every value is a string so rules serialise cleanly into a URL:
 * select = option value, text = text, number = "10000", date = "2026-10-05",
 * relative = a RelativeDate id. `valueTo` is the upper end of `between`.
 */
export type FilterRule = {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
  valueTo?: string;
};

/* ----------------------------------------------------------------------------
 * Operators (specific to the field type, never one giant list)
 * ------------------------------------------------------------------------- */

export const OPERATORS: Record<
  FilterFieldType,
  readonly { value: FilterOperator; label: string }[]
> = {
  select: [
    { value: "is", label: "Is" },
    { value: "is_not", label: "Is not" },
  ],
  text: [
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
    { value: "is", label: "Is" },
    { value: "is_not", label: "Is not" },
  ],
  number: [
    { value: "is", label: "Is" },
    { value: "is_not", label: "Is not" },
    { value: "gt", label: "Greater than" },
    { value: "lt", label: "Less than" },
    { value: "between", label: "Between" },
  ],
  date: [
    { value: "is", label: "Is" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
    { value: "between", label: "Between" },
    { value: "relative", label: "Relative date" },
  ],
};

/** Operator a field starts with. Dates start on "Relative date", the common sales case. */
export function defaultOperator(type: FilterFieldType): FilterOperator {
  return type === "date" ? "relative" : OPERATORS[type][0].value;
}

export const RELATIVE_DATES = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_year", label: "This year" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "next_7_days", label: "Next 7 days" },
  { value: "next_30_days", label: "Next 30 days" },
] as const;

export type RelativeDate = (typeof RELATIVE_DATES)[number]["value"];

/** The operator changed: keep the value only if its meaning survives. */
export function changeOperator(
  rule: FilterRule,
  operator: FilterOperator,
): FilterRule {
  const wasRelative = rule.operator === "relative";
  const isRelative = operator === "relative";
  const keepValue = wasRelative === isRelative;
  return {
    ...rule,
    operator,
    value: keepValue ? rule.value : "",
    valueTo: operator === "between" && keepValue ? rule.valueTo : undefined,
  };
}

/* ----------------------------------------------------------------------------
 * Validity
 * ------------------------------------------------------------------------- */

export function isRuleComplete(rule: FilterRule): boolean {
  if (rule.value.trim() === "") return false;
  if (rule.operator === "between") return (rule.valueTo ?? "").trim() !== "";
  return true;
}

/**
 * Drops rules a saved view or URL can no longer honour: unknown field, an
 * operator the field's type doesn't have, or an unfinished condition.
 */
export function sanitizeRules(
  rules: readonly FilterRule[] | undefined,
  fields: readonly FilterField[],
): FilterRule[] {
  return (rules ?? []).filter((rule) => {
    const field = fields.find((f) => f.id === rule.field);
    return (
      !!field &&
      OPERATORS[field.type].some((o) => o.value === rule.operator) &&
      isRuleComplete(rule)
    );
  });
}

export function sameRules(
  a: readonly FilterRule[],
  b: readonly FilterRule[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (r, i) =>
        r.field === b[i].field &&
        r.operator === b[i].operator &&
        r.value === b[i].value &&
        (r.valueTo ?? "") === (b[i].valueTo ?? ""),
    )
  );
}

let counter = 0;
export function newRuleId(): string {
  counter += 1;
  return `rule-${Date.now().toString(36)}-${counter}`;
}

/* ----------------------------------------------------------------------------
 * Applying filters
 * ------------------------------------------------------------------------- */

export type FilterContext = {
  /** Resolves the "me" option of a select field. */
  currentUserId?: string;
  /** Injectable clock for relative dates. */
  now?: Date;
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Calendar day (local) as "yyyy-mm-dd", or null for missing/invalid input. */
function toDay(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(d.getTime()) ? null : ymd(d);
}

/** Inclusive day range for a relative date. Weeks run Monday to Sunday. */
export function relativeRange(
  preset: string,
  now: Date = new Date(),
): [string, string] | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return [ymd(today), ymd(today)];
    case "this_week": {
      const monday = addDays(today, -((today.getDay() + 6) % 7));
      return [ymd(monday), ymd(addDays(monday, 6))];
    }
    case "this_month":
      return [
        ymd(new Date(today.getFullYear(), today.getMonth(), 1)),
        ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      ];
    case "this_quarter": {
      const q = Math.floor(today.getMonth() / 3) * 3;
      return [
        ymd(new Date(today.getFullYear(), q, 1)),
        ymd(new Date(today.getFullYear(), q + 3, 0)),
      ];
    }
    case "this_year":
      return [`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`];
    case "last_7_days":
      return [ymd(addDays(today, -6)), ymd(today)];
    case "last_30_days":
      return [ymd(addDays(today, -29)), ymd(today)];
    case "next_7_days":
      return [ymd(today), ymd(addDays(today, 6))];
    case "next_30_days":
      return [ymd(today), ymd(addDays(today, 29))];
    default:
      return null;
  }
}

/**
 * Does one deal value satisfy one rule? Missing values never match a positive
 * condition (Is, Contains, Greater than, Before...) and always match the
 * negative ones (Is not, Does not contain).
 */
export function matchesRule(
  raw: unknown,
  rule: FilterRule,
  type: FilterFieldType,
  ctx: FilterContext = {},
): boolean {
  const { operator } = rule;
  const negative = operator === "is_not" || operator === "not_contains";

  if (type === "select") {
    const want = rule.value === "me" ? ctx.currentUserId : rule.value;
    const have = raw === null || raw === undefined ? null : String(raw);
    const same = have !== null && want !== undefined && have === want;
    return operator === "is_not" ? !same : same;
  }

  if (type === "text") {
    const have =
      raw === null || raw === undefined ? "" : String(raw).trim().toLowerCase();
    const want = rule.value.trim().toLowerCase();
    if (have === "") return negative;
    switch (operator) {
      case "contains":
        return have.includes(want);
      case "not_contains":
        return !have.includes(want);
      case "is":
        return have === want;
      case "is_not":
        return have !== want;
      default:
        return false;
    }
  }

  if (type === "number") {
    const n =
      raw === null || raw === undefined || raw === "" ? NaN : Number(raw);
    if (Number.isNaN(n)) return operator === "is_not";
    const a = Number(rule.value);
    const b = Number(rule.valueTo);
    switch (operator) {
      case "is":
        return n === a;
      case "is_not":
        return n !== a;
      case "gt":
        return n > a;
      case "lt":
        return n < a;
      case "between":
        return n >= Math.min(a, b) && n <= Math.max(a, b);
      default:
        return false;
    }
  }

  const day = toDay(raw);
  if (day === null) return false;
  switch (operator) {
    case "is":
      return day === rule.value;
    case "before":
      return day < rule.value;
    case "after":
      return day > rule.value;
    case "between": {
      const [lo, hi] = [rule.value, rule.valueTo ?? rule.value].sort();
      return day >= lo && day <= hi;
    }
    case "relative": {
      const range = relativeRange(rule.value, ctx.now);
      return !!range && day >= range[0] && day <= range[1];
    }
    default:
      return false;
  }
}

/** Rules combine with AND. Unknown fields are ignored (see sanitizeRules). */
export function filterDeals<T>(
  deals: readonly T[],
  rules: readonly FilterRule[],
  fields: readonly FilterField[],
  read: (deal: T, fieldId: string) => unknown,
  ctx?: FilterContext,
): T[] {
  const active = sanitizeRules(rules, fields);
  if (active.length === 0) return deals.slice();
  const types = new Map(fields.map((f) => [f.id, f.type]));
  return deals.filter((deal) =>
    active.every((rule) =>
      matchesRule(read(deal, rule.field), rule, types.get(rule.field)!, ctx),
    ),
  );
}

/** Compact operator text for a filter chip: "Stage = Proposal", "Amount > $10,000". */
export const OPERATOR_SYMBOLS: Record<FilterOperator, string> = {
  is: "=",
  is_not: "≠",
  contains: "contains",
  not_contains: "doesn't contain",
  gt: ">",
  lt: "<",
  between: "between",
  before: "before",
  after: "after",
  relative: "=",
};

function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(raw: string, prefix = ""): string {
  const n = Number(raw);
  return Number.isNaN(n) ? raw : `${prefix}${n.toLocaleString("en-US")}`;
}

/** The value half of a chip: "Proposal", "$10,000", "Nov 10, 2026 – Dec 1, 2026", "This quarter". */
export function formatRuleValue(rule: FilterRule, field: FilterField): string {
  const pair = (fmt: (v: string) => string) =>
    rule.operator === "between"
      ? `${fmt(rule.value)} – ${fmt(rule.valueTo ?? "")}`
      : fmt(rule.value);
  if (field.type === "select") {
    return (
      field.options?.find((o) => o.value === rule.value)?.label ?? rule.value
    );
  }
  if (field.type === "number")
    return pair((v) => formatNumber(v, field.prefix));
  if (field.type === "date") {
    return rule.operator === "relative"
      ? (RELATIVE_DATES.find((r) => r.value === rule.value)?.label ??
          rule.value)
      : pair(formatDay);
  }
  return rule.value;
}

/** Plain-language summary of a rule, for screen readers and tooltips. */
export function describeRule(
  rule: FilterRule,
  fields: readonly FilterField[],
): string {
  const field = fields.find((f) => f.id === rule.field);
  if (!field) return "";
  const op =
    OPERATORS[field.type].find((o) => o.value === rule.operator)?.label ??
    rule.operator;
  const value =
    field.type === "select"
      ? (field.options?.find((o) => o.value === rule.value)?.label ??
        rule.value)
      : rule.operator === "relative"
        ? (RELATIVE_DATES.find((r) => r.value === rule.value)?.label ??
          rule.value)
        : rule.value;
  const to = rule.operator === "between" ? ` and ${rule.valueTo ?? ""}` : "";
  return `${field.label} ${op.toLowerCase()} ${value}${to}`;
}

/* ----------------------------------------------------------------------------
 * Default fields
 * ------------------------------------------------------------------------- */

/** Starter field set. Replace the options with your real stages and team members. */
export const DEFAULT_FILTER_FIELDS: readonly FilterField[] = [
  {
    id: "stage",
    label: "Stage",
    group: "Deal",
    type: "select",
    options: [
      { value: "lead", label: "Lead" },
      { value: "qualified", label: "Qualified" },
      { value: "proposal", label: "Proposal" },
      { value: "negotiation", label: "Negotiation" },
      { value: "won", label: "Won" },
      { value: "lost", label: "Lost" },
    ],
  },
  { id: "amount", label: "Amount", group: "Deal", type: "number", prefix: "$" },
  { id: "closeDate", label: "Close Date", group: "Deal", type: "date" },
  {
    id: "owner",
    label: "Owner",
    group: "Ownership",
    type: "select",
    options: [{ value: "me", label: "Me" }],
  },
  { id: "company", label: "Company", group: "Relationship", type: "text" },
  { id: "contact", label: "Contact", group: "Relationship", type: "text" },
  { id: "createdAt", label: "Created Date", group: "Other", type: "date" },
  { id: "updatedAt", label: "Updated Date", group: "Other", type: "date" },
];
