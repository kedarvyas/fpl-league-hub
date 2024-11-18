import React, { useMemo } from 'react';
import { useTable, useSortBy } from 'react-table';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const LeagueTable = ({ standings }) => {
  const columns = useMemo(
    () => [
      {
        Header: 'Rank',
        accessor: 'rank',
        width: 30, 
      },
      {
        Header: 'Team',
        accessor: 'entry_name',
      },
      {
        Header: 'Pts',
        accessor: 'total',
        width: 30,
      },
    ],
    []
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    { columns, data: standings },
    useSortBy
  );

  return (
    <div className="overflow-x-auto text-xs">
      <table {...getTableProps()} className="w-full">
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()} className="bg-gray-100">
              {headerGroup.headers.map(column => (
                <th
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  className="p-2 text-left font-semibold text-gray-600"
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
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()} className="border-b border-gray-200 hover:bg-gray-50">
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()} className="p-2">
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeagueTable;