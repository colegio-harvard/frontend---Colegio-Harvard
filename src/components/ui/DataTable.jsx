import { useState, useMemo, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { HiChevronUp, HiChevronDown, HiSelector, HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const DataTable = ({ columns, data, loading, emptyMessage = 'No hay registros', rowsPerPage = 0 }) => {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(null); // 'asc' | 'desc' | null
  const [currentPage, setCurrentPage] = useState(1);

  const isSortable = (col) => col.accessor || col.sortValue;

  const getValue = (row, col) => {
    if (col.sortValue) return col.sortValue(row);
    if (col.accessor) return row[col.accessor];
    return '';
  };

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (sortCol === null || sortDir === null) return data;
    const col = columns[sortCol];
    return [...data].sort((a, b) => {
      let va = getValue(a, col);
      let vb = getValue(b, col);

      if (va == null) va = '';
      if (vb == null) vb = '';

      let result;
      if (typeof va === 'number' && typeof vb === 'number') {
        result = va - vb;
      } else {
        result = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
      }

      return sortDir === 'desc' ? -result : result;
    });
  }, [data, sortCol, sortDir, columns]);

  // Pagination
  const isPaginated = rowsPerPage > 0;
  const totalPages = isPaginated ? Math.max(1, Math.ceil((sortedData?.length || 0) / rowsPerPage)) : 1;

  useEffect(() => { setCurrentPage(1); }, [data, rowsPerPage]);

  const paginatedData = useMemo(() => {
    if (!isPaginated || !sortedData) return sortedData;
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage, isPaginated]);

  if (loading) return <LoadingSpinner />;

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-cream-400">
        <p className="font-display">{emptyMessage}</p>
      </div>
    );
  }

  const handleSort = (colIndex) => {
    const col = columns[colIndex];
    if (!isSortable(col)) return;

    if (sortCol !== colIndex) {
      setSortCol(colIndex);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortCol(null);
      setSortDir(null);
    }
  };

  const SortIcon = ({ colIndex }) => {
    if (sortCol === colIndex && sortDir === 'asc') return <HiChevronUp className="w-3.5 h-3.5 text-primary-600" />;
    if (sortCol === colIndex && sortDir === 'desc') return <HiChevronDown className="w-3.5 h-3.5 text-primary-600" />;
    return <HiSelector className="w-3.5 h-3.5 text-cream-400" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-cream-200">
        <thead>
          <tr>
            {columns.map((col, i) => {
              const sortable = isSortable(col);
              return (
                <th
                  key={i}
                  onClick={() => sortable && handleSort(i)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gold-700 uppercase tracking-wider bg-gradient-to-b from-cream-50 to-cream-100 border-b-2 border-gold-200/50 select-none ${sortable ? 'cursor-pointer hover:bg-cream-200/60 transition-colors' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {sortable && <SortIcon colIndex={i} />}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-cream-100">
          {(isPaginated ? paginatedData : sortedData).map((row, rowIndex) => (
            <tr key={row.id || rowIndex} className="hover:bg-gold-50/30 transition-colors duration-150">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-4 py-3 text-sm text-primary-800/80 whitespace-nowrap">
                  {col.render ? col.render(row, rowIndex) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {isPaginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-cream-200 bg-cream-50/50">
          <span className="text-sm text-primary-800/60">
            Mostrando {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, sortedData.length)} de {sortedData.length} registros
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-primary-800/60 hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .reduce((acc, page, idx, arr) => {
                if (idx > 0 && page - arr[idx - 1] > 1) acc.push('...');
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`dots-${idx}`} className="px-1 text-sm text-primary-800/40">...</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={`min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === item
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-primary-800/60 hover:bg-cream-200'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-primary-800/60 hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
