import { createPortal } from "react-dom";
import type { Column } from "../DataTable";
import { useFloatingMenu } from "../../hooks/useFloatingMenu";

interface ColumnFilterProps<T> {
  columns: Array<Column<T>>;
  hiddenColumns: Set<string>;
  onToggleColumn: (key: string) => void;
  onToggleAll: () => void;
  allOptionalVisible: boolean;
}

export function ColumnFilter<T>({ columns, hiddenColumns, onToggleColumn, onToggleAll, allOptionalVisible }: ColumnFilterProps<T>) {
  const { isOpen, menuRef, position, triggerRef, toggle } = useFloatingMenu();
  return <>
    <div className="column-filter" ref={triggerRef}>
      <button className="column-filter-button" type="button" aria-expanded={isOpen} aria-controls="production-column-filter" onClick={toggle}>Filter</button>
    </div>
    {isOpen && createPortal(
      <div className="column-filter-menu column-filter-menu-portal" id="production-column-filter" ref={menuRef} style={position}>
        <button className="column-filter-toggle-all" type="button" onClick={onToggleAll}>{allOptionalVisible ? "Deselect All" : "Select All"}</button>
        {columns.map((column) => <label key={column.key}><input type="checkbox" checked={!hiddenColumns.has(column.key)} disabled={column.key === "date"} onChange={() => onToggleColumn(column.key)} />{column.label}</label>)}
      </div>, document.body,
    )}
  </>;
}
