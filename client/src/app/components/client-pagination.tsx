"use client";

import { Children, type ReactNode, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function paginationPages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

function pageBounds(page: number, pageSize: number, totalItems: number) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    startIndex,
    endIndex,
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: endIndex
  };
}

function PaginationControls({
  label,
  page,
  pageSize,
  totalItems,
  onPageChange
}: {
  label: string;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const pages = paginationPages(page, totalPages);
  const bounds = pageBounds(page, pageSize, totalItems);
  let previousRenderedPage = 0;

  return (
    <nav className="pagination" aria-label={label}>
      <p>
        {bounds.startItem}-{bounds.endItem} / {totalItems}
      </p>
      <div className="pagination-controls">
        <button
          aria-disabled={page === 1}
          aria-label="이전 페이지"
          className={cx("pagination-button icon", page === 1 && "disabled")}
          disabled={page === 1}
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((item) => {
          const hasGap = previousRenderedPage > 0 && item - previousRenderedPage > 1;
          previousRenderedPage = item;
          return (
            <span className="pagination-page-group" key={item}>
              {hasGap ? <span className="pagination-ellipsis">...</span> : null}
              <button
                aria-current={item === page ? "page" : undefined}
                className={cx("pagination-button", item === page && "active")}
                type="button"
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            </span>
          );
        })}
        <button
          aria-disabled={page === totalPages}
          aria-label="다음 페이지"
          className={cx("pagination-button icon", page === totalPages && "disabled")}
          disabled={page === totalPages}
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

export function PaginatedList({
  children,
  className,
  id,
  label,
  pageSize
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  label: string;
  pageSize: number;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(1);
  const currentPage = Math.min(page, totalPages);
  const bounds = pageBounds(currentPage, pageSize, items.length);

  return (
    <>
      <section className={cx("list", className)} id={id}>
        {items.slice(bounds.startIndex, bounds.endIndex)}
      </section>
      <PaginationControls
        label={label}
        page={currentPage}
        pageSize={pageSize}
        totalItems={items.length}
        onPageChange={setPage}
      />
    </>
  );
}

export function PaginatedPanelTable({
  children,
  className,
  colSpan,
  emptyText,
  footerRows,
  header,
  id,
  label,
  panelClassName,
  panelHeader,
  pageSize
}: {
  children: ReactNode;
  className?: string;
  colSpan: number;
  emptyText: string;
  footerRows?: ReactNode;
  header: ReactNode;
  id?: string;
  label: string;
  panelClassName?: string;
  panelHeader: ReactNode;
  pageSize: number;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  const stickyRows = Children.toArray(footerRows).filter(Boolean);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const [page, setPage] = useState(1);
  const currentPage = Math.min(page, totalPages);
  const bounds = pageBounds(currentPage, pageSize, rows.length);
  const visibleRows = rows.slice(bounds.startIndex, bounds.endIndex);

  return (
    <>
      <section className={cx("panel", panelClassName)} id={id}>
        {panelHeader}
        <div className={cx("table-wrap", className)}>
          <table>
            <thead>{header}</thead>
            <tbody>
              {rows.length > 0 ? visibleRows : (
                <tr>
                  <td colSpan={colSpan}>{emptyText}</td>
                </tr>
              )}
              {stickyRows}
            </tbody>
          </table>
        </div>
      </section>
      <PaginationControls
        label={label}
        page={currentPage}
        pageSize={pageSize}
        totalItems={rows.length}
        onPageChange={setPage}
      />
    </>
  );
}
