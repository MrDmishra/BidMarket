import type { ReactNode } from "react";

export type Column<Row> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty?: ReactNode;
};

/** Explicit roles keep table semantics when phones stack the rows with display: block. */
export function DataTable<Row>({ caption, columns, rows, rowKey, empty }: DataTableProps<Row>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-surface">
      <table role="table" className="w-full border-collapse text-[15px] max-sm:block">
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup" className="bg-sunk max-sm:sr-only">
          <tr role="row">
            {columns.map((column) => (
              <th
                key={column.key}
                role="columnheader"
                scope="col"
                className={`border-b border-line px-3.5 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-sm:block">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              role="row"
              className="border-b border-line last:border-b-0 max-sm:block max-sm:py-2"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  role="cell"
                  data-label={column.header}
                  className={`px-3.5 py-2.5 align-top max-sm:flex max-sm:justify-between max-sm:gap-4 max-sm:py-1 max-sm:text-right max-sm:before:text-left max-sm:before:text-sm max-sm:before:text-muted max-sm:before:content-[attr(data-label)] ${
                    column.align === "right" ? "font-mono tabular-nums sm:text-right" : ""
                  }`}
                >
                  <span className="min-w-0">{column.render(row)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
