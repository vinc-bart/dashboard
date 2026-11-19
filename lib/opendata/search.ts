import type { DatasetConfig, OpenDataRecord } from "./client";
import { scalarString } from "@/lib/safe-string";

export function cellSearchText(value: unknown) {
  if (value == null || value === "") return "";
  if (typeof value === "object") return JSON.stringify(value);
  return scalarString(value);
}

/** Lowercased haystack per record, built once so each keystroke is a cheap `includes`. */
export function buildSearchIndex(
  records: OpenDataRecord[],
  columns: DatasetConfig["columns"],
): string[] {
  return records.map((record) =>
    columns.map((column) => cellSearchText(record[column.key]).toLowerCase()).join("\u0001"),
  );
}

export function filterByQuery(
  records: OpenDataRecord[],
  index: string[],
  query: string,
): OpenDataRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return records;
  return records.filter((_, i) => index[i].includes(needle));
}

export function recordMatchesQuery(
  record: OpenDataRecord,
  columns: DatasetConfig["columns"],
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return columns.some((column) => cellSearchText(record[column.key]).toLowerCase().includes(needle));
}
