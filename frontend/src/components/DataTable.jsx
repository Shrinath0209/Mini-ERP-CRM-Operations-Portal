import React, { useState } from 'react';

export default function DataTable({ columns, data, onRowClick, searchable, searchPlaceholder = "Search..." }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="glass-panel" style={{ padding: '1rem' }}>
      {searchable && (
        <div style={{ marginBottom: '1rem' }}>
          <input 
            type="text" 
            className="input" 
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
        </div>
      )}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? filteredData.map((row, i) => (
              <tr key={i} onClick={() => onRowClick && onRowClick(row)}>
                {columns.map((col, j) => (
                  <td key={j}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
