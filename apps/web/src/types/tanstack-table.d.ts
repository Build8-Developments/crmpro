import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // Presentation hints shared by every data table (see components/data-table).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Name in the "View" menu (headers can be empty or JSX). */
    label?: string;
    align?: "left" | "right" | "center";
    /** Can't be hidden from the View menu (e.g. the name column). */
    required?: boolean;
    /** Header is a sort button; the column id is the API sort field. */
    sortable?: boolean;
    /** Hide the column below this breakpoint (CSS only, no JS width checks). */
    hideBelow?: "sm" | "md" | "lg" | "xl";
    /** Extra classes for the header cell (e.g. a fixed width in auto layout). */
    headerClassName?: string;
    /** Extra classes for every body cell in the column. */
    cellClassName?: string;
  }
}
