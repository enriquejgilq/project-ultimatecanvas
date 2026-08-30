import { Spinner } from '../../atoms/Spinner';
import type { DataTableProps } from './DataTable.types';

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading,
  emptyMessage = 'No data available.',
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="glass glass-highlight flex items-center justify-center rounded-[--glass-radius] p-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass glass-highlight rounded-[--glass-radius] p-10 text-center text-sm text-white/70">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`glass glass-highlight overflow-x-auto rounded-[--glass-radius] ${className}`}>
      <table className="w-full border-collapse text-left text-sm text-white/90">
        <thead>
          <tr className="border-b border-white/15 text-xs uppercase tracking-wide text-white/60">
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 font-medium ${column.className ?? ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-white/10 last:border-0 hover:bg-white/5"
            >
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
