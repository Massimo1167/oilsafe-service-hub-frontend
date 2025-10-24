/**
 * Line chart component showing temporal trend of service sheets
 */
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function TrendTemporaleChart({ trendData, periodo }) {
  if (!trendData || trendData.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        color: '#999',
        fontStyle: 'italic'
      }}>
        Nessun dato disponibile per il trend temporale
      </div>
    );
  }

  // Formatta la label dell'asse X in base al periodo
  const formatXAxisLabel = (value) => {
    if (!value) return '';

    // Se è formato YYYY-MM (mensile)
    if (value.length === 7 && value.includes('-') && value.split('-').length === 2) {
      const [year, month] = value.split('-');
      const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }

    // Se è formato YYYY-MM-DD (giornaliero o settimanale)
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Per periodi settimanali o giornalieri, mostra giorno/mese
    return `${day}/${month}`;
  };

  // Tooltip personalizzato
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '0.9em' }}>
            Periodo: {formatXAxisLabel(label)}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', fontSize: '0.85em', color: entry.color }}>
              <strong>{entry.name}:</strong> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={trendData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="periodo"
          tickFormatter={formatXAxisLabel}
          angle={-45}
          textAnchor="end"
          height={80}
          interval={periodo === 'anno_corrente' ? 0 : 'preserveStartEnd'}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          label={{ value: 'Numero Fogli', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="totale"
          stroke="#007bff"
          strokeWidth={2}
          name="Totale"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="aperti"
          stroke="#17a2b8"
          strokeWidth={2}
          name="Aperti"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="inLavorazione"
          stroke="#ffc107"
          strokeWidth={2}
          name="In Lavorazione"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="completati"
          stroke="#28a745"
          strokeWidth={2}
          name="Completati"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TrendTemporaleChart;
