import React, { useMemo, useState } from 'react';
import { useTable, useSortBy } from 'react-table';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

// On a phone/tablet the full 20+ row table pushes everything else off screen,
// so we show a preview and let the user opt in to the rest. Because the desktop
// layout only kicks in at lg, the cut-off is CSS-driven at that same breakpoint.
const MOBILE_PREVIEW_ROWS = 8;

const LeagueTable = ({ standings }) => {
  const [showAllOnMobile, setShowAllOnMobile] = useState(false);

  const columns = useMemo(
    () => [
      {
        Header: 'Rank',
        accessor: 'rank',
        width: 40,
      },
      {
        Header: 'Team',
        accessor: 'entry_name',
      },
      {
        Header: 'Pts',
        accessor: 'total',
        width: 40,
      },
    ],
    []
  );

  const data = useMemo(() => standings || [], [standings]);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    { columns, data },
    useSortBy
  );

  const hiddenOnMobile = Math.max(0, rows.length - MOBILE_PREVIEW_ROWS);

  return (
    <div className="text-xs">
      <table {...getTableProps()} className="w-full">
        <thead>
          {headerGroups.map(headerGroup => {
            const { key: headerGroupKey, ...headerGroupProps } = headerGroup.getHeaderGroupProps();
            return (
              <tr key={headerGroupKey} {...headerGroupProps} className="bg-muted">
                {headerGroup.headers.map(column => {
                  const { key: columnKey, ...columnProps } = column.getHeaderProps(
                    column.getSortByToggleProps()
                  );
                  return (
                    <th
                      key={columnKey}
                      {...columnProps}
                      className="px-2 py-3 text-left font-semibold text-muted-foreground select-none cursor-pointer"
                      style={{ width: column.width }}
                    >
                      {column.render('Header')}
                      <span className="ml-1">
                        {column.isSorted ? (
                          column.isSortedDesc ? (
                            <ChevronDownIcon className="inline w-3 h-3" />
                          ) : (
                            <ChevronUpIcon className="inline w-3 h-3" />
                          )
                        ) : (
                          ''
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            );
          })}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row, rowIndex) => {
            prepareRow(row);
            const { key: rowKey, ...rowProps } = row.getRowProps();
            // Rows past the preview are hidden on mobile only (CSS), never on md+.
            const collapsedOnMobile =
              !showAllOnMobile && rowIndex >= MOBILE_PREVIEW_ROWS
                ? 'hidden lg:table-row'
                : '';
            return (
              <tr
                key={rowKey}
                {...rowProps}
                className={`border-b border-border hover:bg-muted/50 ${collapsedOnMobile}`}
              >
                {row.cells.map(cell => {
                  const { key: cellKey, ...cellProps } = cell.getCellProps();
                  return (
                    <td key={cellKey} {...cellProps} className="px-2 py-2.5 align-middle">
                      {cell.render('Cell')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {hiddenOnMobile > 0 && (
        <button
          type="button"
          onClick={() => setShowAllOnMobile(v => !v)}
          className="lg:hidden w-full min-h-[44px] mt-2 rounded-lg bg-muted text-xs font-semibold text-primary hover:bg-muted/70 transition-colors"
        >
          {showAllOnMobile
            ? 'Show fewer teams'
            : `Show all ${rows.length} teams`}
        </button>
      )}
    </div>
  );
};

export default LeagueTable;
