import * as React from "react";
import { Search, X, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * EnterpriseTable — reusable, dense data-table primitive for admin/super-admin panels.
 *
 * Features:
 *  • Sticky header with subtle top shadow on scroll
 *  • Built-in search box + filter chip strip
 *  • Client-side pagination with page-size control
 *  • Row hover highlight, zebra option, status-badge friendly cells
 *  • Mobile fallback: each row collapses to a stacked card
 *  • Loading skeletons + empty-state slot
 *
 * Use for any new admin table. Existing tables can opt-in incrementally.
 *
 * @example
 * <EnterpriseTable
 *   data={students}
 *   loading={isLoading}
 *   getRowKey={(r) => r.id}
 *   searchKeys={["name", "enrollment_no"]}
 *   filters={[{ key: "status", label: "All", value: "all" }, { key: "status", label: "Active", value: "active" }]}
 *   columns={[
 *     { key: "name",          header: "Name",         cell: (r) => r.name, mobileLabel: true },
 *     { key: "enrollment_no", header: "Enrollment",   cell: (r) => r.enrollment_no, mono: true },
 *     { key: "status",        header: "Status",       cell: (r) => <StatusBadge status={r.status} /> },
 *   ]}
 * />
 */

export interface EnterpriseColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  /** Use mono/tabular font for numeric / IDs */
  mono?: boolean;
  /** Hide column on small screens */
  hideOnMobile?: boolean;
  /** When mobile-card mode renders, treat this column's cell as the card title */
  mobileLabel?: boolean;
  className?: string;
  width?: string;
}

export interface EnterpriseFilter {
  key: string;
  label: string;
  value: string;
}

export interface EnterpriseTableProps<T> {
  data: T[];
  columns: EnterpriseColumn<T>[];
  getRowKey: (row: T, index: number) => string;
  loading?: boolean;
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  filters?: EnterpriseFilter[];
  /** Callback when a filter chip is selected. Filtering itself is parent-managed. */
  onFilterChange?: (filter: EnterpriseFilter | null) => void;
  activeFilterValue?: string;
  /** Optional row click handler */
  onRowClick?: (row: T) => void;
  /** Page size options */
  pageSizes?: number[];
  defaultPageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
  /** Right-aligned controls in the toolbar (e.g. "Add" button) */
  toolbarActions?: React.ReactNode;
}

export function EnterpriseTable<T>({
  data,
  columns,
  getRowKey,
  loading,
  searchKeys,
  searchPlaceholder = "Search…",
  filters,
  onFilterChange,
  activeFilterValue,
  onRowClick,
  pageSizes = [10, 25, 50, 100],
  defaultPageSize = 25,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyAction,
  className,
  toolbarActions,
}: EnterpriseTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  const filtered = React.useMemo(() => {
    if (!query || !searchKeys?.length) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) => String((row as any)[k] ?? "").toLowerCase().includes(q))
    );
  }, [data, query, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  React.useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  const paged = React.useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const titleCol = columns.find((c) => c.mobileLabel) ?? columns[0];

  return (
    <div className={cn("rounded-2xl border border-border-subtle bg-surface-1 shadow-sm overflow-hidden", className)}>
      {/* Toolbar */}
      {(searchKeys?.length || filters?.length || toolbarActions) && (
        <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface-1 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            {searchKeys?.length ? (
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder={searchPlaceholder}
                  className="h-9 pl-9 pr-8 text-sm"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-surface-2"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : null}
            {filters?.length ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {filters.map((f) => {
                  const active = activeFilterValue === f.value;
                  return (
                    <button
                      key={`${f.key}-${f.value}`}
                      type="button"
                      onClick={() => onFilterChange?.(active ? null : f)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border-subtle bg-surface-2 text-muted-foreground hover:border-border-strong hover:text-foreground",
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          {toolbarActions ? <div className="flex items-center gap-2">{toolbarActions}</div> : null}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur supports-[backdrop-filter]:bg-surface-2/80">
              <tr className="border-b border-border-subtle">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
                      c.className,
                    )}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-border-subtle/60">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16">
                    <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={getRowKey(row, i)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-border-subtle/60 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-surface-2",
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3 text-foreground",
                          c.mono && "font-mono tabular-nums text-[13px]",
                          c.className,
                        )}
                      >
                        {c.cell(row, i)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : paged.length === 0 ? (
          <div className="p-6"><EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} /></div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {paged.map((row, i) => (
              <li
                key={getRowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("p-3", onRowClick && "cursor-pointer active:bg-surface-2")}
              >
                <div className="mb-1.5 text-sm font-semibold text-foreground">
                  {titleCol.cell(row, i)}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {columns.filter((c) => c !== titleCol && !c.hideOnMobile).map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.header}</dt>
                      <dd className={cn("truncate text-xs text-foreground", c.mono && "font-mono tabular-nums")}>
                        {c.cell(row, i)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination footer */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border-subtle bg-surface-1 px-3 py-2.5 md:flex-row">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Showing <span className="font-semibold text-foreground tabular-nums">{(page - 1) * pageSize + 1}</span>–
              <span className="font-semibold text-foreground tabular-nums">{Math.min(page * pageSize, filtered.length)}</span> of{" "}
              <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>
            </span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="ml-2 rounded-md border border-border-subtle bg-surface-2 px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {pageSizes.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs font-medium tabular-nums text-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export default EnterpriseTable;
