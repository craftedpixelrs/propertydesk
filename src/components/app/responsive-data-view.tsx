"use client";

import * as React from "react";
import { DesktopDataTable, type Column } from "@/components/tables/desktop-data-table";
import { MobileCardList } from "@/components/mobile/mobile-card-list";

export interface ResponsiveDataViewProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  renderMobile: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * Picks between a desktop data table and a mobile card list based on the
 * `md` Tailwind breakpoint. This is a pure CSS switch — both views are
 * rendered in the DOM and shown/hidden with `hidden md:block`, which
 * keeps hydration simple and avoids screen-size guessing on SSR.
 */
export function ResponsiveDataView<T>({
  columns,
  data,
  rowKey,
  renderMobile,
  onRowClick,
  className,
}: ResponsiveDataViewProps<T>) {
  return (
    <div className={className}>
      <div className="md:hidden">
        <MobileCardList
          data={data}
          rowKey={rowKey}
          renderItem={renderMobile}
          onItemClick={onRowClick}
        />
      </div>
      <div className="hidden md:block">
        <DesktopDataTable
          columns={columns}
          data={data}
          rowKey={rowKey}
          onRowClick={onRowClick}
        />
      </div>
    </div>
  );
}
