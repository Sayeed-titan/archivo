"use client";

import { useActionState, useState } from "react";
import { saveReportTemplate, type SaveTemplateState } from "@/app/actions/reports";
import type { ReportFieldDef, ReportFieldType } from "@/lib/reports/fields";

type FilterRow = { field: string; operator: string; value: string };

const OPERATORS_BY_TYPE: Record<ReportFieldType, { value: string; label: string }[]> = {
  text: [
    { value: "equals", label: "is" },
    { value: "contains", label: "contains" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "gt", label: ">" },
    { value: "gte", label: ">=" },
    { value: "lt", label: "<" },
    { value: "lte", label: "<=" },
  ],
  date: [
    { value: "gte", label: "on/after" },
    { value: "lte", label: "on/before" },
  ],
  select: [{ value: "equals", label: "is" }],
};

export function ReportBuilderForm({ fields }: { fields: ReportFieldDef[] }) {
  const [state, action, pending] = useActionState<SaveTemplateState, FormData>(saveReportTemplate, undefined);
  const [selectedFields, setSelectedFields] = useState<string[]>(["archiveNumber", "name", "status"]);
  const [filters, setFilters] = useState<FilterRow[]>([]);

  const filterableFields = fields.filter((f) => f.kind === "raw" || f.key === "category");

  function toggleField(key: string) {
    setSelectedFields((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  function addFilter() {
    setFilters((prev) => [...prev, { field: filterableFields[0]?.key ?? "", operator: "equals", value: "" }]);
  }

  function updateFilter(index: number, patch: Partial<FilterRow>) {
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFilter(index: number) {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={action} className="mt-6 space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Report name</label>
        <input name="name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Description (optional)</label>
        <input name="description" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-700">Fields to include</h2>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-md border border-slate-200 p-3">
          {fields.map((field) => (
            <label key={field.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="fields"
                value={field.key}
                checked={selectedFields.includes(field.key)}
                onChange={() => toggleField(field.key)}
              />
              {field.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">Filters</h2>
          <button type="button" onClick={addFilter} className="text-sm text-slate-500 underline">
            + Add filter
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {filters.map((filter, i) => {
            const fieldDef = filterableFields.find((f) => f.key === filter.field);
            const type: ReportFieldType = fieldDef?.type ?? "text";
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <select
                  value={filter.field}
                  onChange={(e) => updateFilter(i, { field: e.target.value, operator: "equals" })}
                  className="rounded-md border border-slate-300 px-2 py-1"
                >
                  {filterableFields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(i, { operator: e.target.value })}
                  className="rounded-md border border-slate-300 px-2 py-1"
                >
                  {OPERATORS_BY_TYPE[type].map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <input
                  value={filter.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  type={type === "date" ? "date" : "text"}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1"
                />
                <button type="button" onClick={() => removeFilter(i)} className="text-xs text-red-600">
                  remove
                </button>
              </div>
            );
          })}
          {filters.length === 0 && <p className="text-sm text-slate-400">No filters — report will include all archives.</p>}
        </div>
      </div>

      <input type="hidden" name="filtersJson" value={JSON.stringify(filters)} />

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        disabled={pending}
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save report template"}
      </button>
    </form>
  );
}
