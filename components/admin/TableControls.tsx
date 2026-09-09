"use client";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { downloadTable, type Cell } from "./data-tools";
export function ExportControls({
  name,
  headers,
  rows,
}: {
  name: string;
  headers: string[];
  rows: Cell[][];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="admin-btn"
        disabled={!rows.length}
        onClick={() => downloadTable(name, headers, rows, "csv")}
      >
        <Download size={15} />
        CSV
      </button>
      <button
        type="button"
        className="admin-btn"
        disabled={!rows.length}
        onClick={() => downloadTable(name, headers, rows, "excel")}
      >
        Excel
      </button>
    </div>
  );
}
export function Pagination({
  page,
  count,
  size,
  onPage,
  onSize,
}: {
  page: number;
  count: number;
  size: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <div className="admin-pagination">
      <span className="admin-muted" role="status">
        {count ? (page - 1) * size + 1 : 0}–{Math.min(page * size, count)} of{" "}
        {count}
      </span>
      <div>
        <label className="sr-only" htmlFor="page-size">
          Rows per page
        </label>
        <select
          id="page-size"
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          className="admin-btn"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="admin-muted">
          {page} / {pages}
        </span>
        <button
          type="button"
          className="admin-btn"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="admin-status" data-status={status}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
