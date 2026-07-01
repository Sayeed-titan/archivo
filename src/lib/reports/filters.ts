export type ReportFilterOperator = "equals" | "contains" | "gte" | "lte" | "gt" | "lt";

export type ReportFilter = {
  field: string; // a key from REPORT_FIELDS (raw fields only — computed fields can't be filtered at the query level)
  operator: ReportFilterOperator;
  value: string;
};

export function isValidFilter(f: unknown): f is ReportFilter {
  if (typeof f !== "object" || f === null) return false;
  const candidate = f as Record<string, unknown>;
  return (
    typeof candidate.field === "string" &&
    typeof candidate.operator === "string" &&
    typeof candidate.value === "string"
  );
}

export function parseFilters(json: unknown): ReportFilter[] {
  if (!Array.isArray(json)) return [];
  return json.filter(isValidFilter);
}
