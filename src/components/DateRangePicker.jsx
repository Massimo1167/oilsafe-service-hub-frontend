/**
 * Date Range Picker component for custom period selection
 * Uses react-datepicker for date inputs with Italian locale
 */
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { it } from 'date-fns/locale/it';
import 'react-datepicker/dist/react-datepicker.css';

// Registra locale italiano
registerLocale('it', it);

function DateRangePicker({ onRangeChange, initialStart, initialEnd }) {
  const [startDate, setStartDate] = useState(initialStart || new Date());
  const [endDate, setEndDate] = useState(initialEnd || new Date());
  const [error, setError] = useState('');

  const handleStartDateChange = (date) => {
    setStartDate(date);
    setError('');

    // Se data inizio > data fine, aggiorna anche data fine
    if (date && endDate && date > endDate) {
      setEndDate(date);
    }
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
    setError('');

    // Validazione: data fine deve essere >= data inizio
    if (date && startDate && date < startDate) {
      setError('La data di fine deve essere successiva o uguale alla data di inizio');
      return;
    }
  };

  const handleApply = () => {
    if (!startDate || !endDate) {
      setError('Seleziona entrambe le date');
      return;
    }

    if (endDate < startDate) {
      setError('La data di fine deve essere successiva o uguale alla data di inizio');
      return;
    }

    setError('');
    onRangeChange(startDate, endDate);
  };

  const handlePreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    setStartDate(start);
    setEndDate(end);
    setError('');
  };

  const handleReset = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    setStartDate(firstDayOfMonth);
    setEndDate(today);
    setError('');

    onRangeChange(firstDayOfMonth, today);
  };

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      marginBottom: '1rem'
    }}>
      <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1em' }}>
        Seleziona Periodo Personalizzato
      </h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Data Inizio */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.9em',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: '#495057'
          }}>
            Data Inizio:
          </label>
          <DatePicker
            selected={startDate}
            onChange={handleStartDateChange}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            locale="it"
            dateFormat="dd/MM/yyyy"
            maxDate={new Date()}
            placeholderText="Seleziona data inizio"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            wrapperClassName="date-picker-wrapper"
            className="date-picker-input"
          />
        </div>

        {/* Data Fine */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.9em',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: '#495057'
          }}>
            Data Fine:
          </label>
          <DatePicker
            selected={endDate}
            onChange={handleEndDateChange}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            maxDate={new Date()}
            locale="it"
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleziona data fine"
            wrapperClassName="date-picker-wrapper"
            className="date-picker-input"
          />
        </div>
      </div>

      {/* Preset rapidi */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{
          fontSize: '0.85em',
          color: '#6c757d',
          marginBottom: '0.5rem',
          fontWeight: 'bold'
        }}>
          Scorciatoie:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handlePreset(7)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85em',
              borderRadius: '4px',
              border: '1px solid #6c757d',
              backgroundColor: '#fff',
              color: '#6c757d',
              cursor: 'pointer'
            }}
          >
            Ultimi 7 giorni
          </button>
          <button
            onClick={() => handlePreset(14)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85em',
              borderRadius: '4px',
              border: '1px solid #6c757d',
              backgroundColor: '#fff',
              color: '#6c757d',
              cursor: 'pointer'
            }}
          >
            Ultimi 14 giorni
          </button>
          <button
            onClick={() => handlePreset(30)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85em',
              borderRadius: '4px',
              border: '1px solid #6c757d',
              backgroundColor: '#fff',
              color: '#6c757d',
              cursor: 'pointer'
            }}
          >
            Ultimi 30 giorni
          </button>
          <button
            onClick={() => handlePreset(90)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85em',
              borderRadius: '4px',
              border: '1px solid #6c757d',
              backgroundColor: '#fff',
              color: '#6c757d',
              cursor: 'pointer'
            }}
          >
            Ultimi 90 giorni
          </button>
        </div>
      </div>

      {/* Errore */}
      {error && (
        <div style={{
          padding: '0.5rem',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24',
          fontSize: '0.9em',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* Pulsanti azione */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={handleReset}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            borderRadius: '4px',
            border: '1px solid #6c757d',
            backgroundColor: '#fff',
            color: '#6c757d',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            borderRadius: '4px',
            border: '1px solid #007bff',
            backgroundColor: '#007bff',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Applica
        </button>
      </div>

      {/* CSS inline per DatePicker */}
      <style>{`
        .date-picker-wrapper {
          width: 100%;
        }

        .date-picker-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ced4da;
          borderRadius: 4px;
          fontSize: 1rem;
        }

        .date-picker-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        .react-datepicker {
          font-family: inherit;
        }

        .react-datepicker__header {
          background-color: #007bff;
          border-bottom: none;
        }

        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: white;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--in-range {
          background-color: #007bff;
        }

        .react-datepicker__day--keyboard-selected {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  );
}

export default DateRangePicker;
