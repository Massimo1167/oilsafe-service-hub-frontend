/**
 * Bar chart component showing distribution of service sheets by status
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { STATO_FOGLIO_STEPS } from '../../utils/statoFoglio';

function FogliPerStatoChart({ statsByStatus }) {
  // Colori coordinati con quelli della dashboard
  const stateColors = {
    'Aperto': '#17a2b8',
    'In Lavorazione': '#ffc107',
    'Attesa Firma': '#fd7e14',
    'Completato': '#28a745',
    'Consuntivato': '#20c997',
    'Inviato': '#007bff',
    'In attesa accettazione': '#6f42c1',
    'Fatturato': '#343a40',
    'Chiuso': '#dc3545'
  };

  // Prepara i dati per il grafico
  const chartData = STATO_FOGLIO_STEPS.map(stato => ({
    stato: stato,
    count: statsByStatus[stato] || 0,
    color: stateColors[stato] || '#6c757d'
  })).filter(item => item.count > 0); // Mostra solo stati con fogli

  if (chartData.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        color: '#999',
        fontStyle: 'italic'
      }}>
        Nessun dato disponibile per il grafico
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="stato"
          angle={-45}
          textAnchor="end"
          height={100}
          interval={0}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          label={{ value: 'Numero Fogli', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px'
          }}
          formatter={(value) => [`${value} fogli`, 'Totale']}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          payload={[{ value: 'Fogli per Stato', type: 'square', color: '#007bff' }]}
        />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 12 }}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default FogliPerStatoChart;
