import React from 'react';

function InterventoCard({ intervento, canModify, onEdit, onDelete, onView, isSelected, onToggleSelect }) {
    if (!intervento) return null;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
    const tecnicoNome = intervento.tecnici
        ? `${intervento.tecnici.nome} ${intervento.tecnici.cognome}`
        : 'N/D';
    return (
        <div className="intervento-card" style={{position: 'relative', paddingTop: canModify ? '30px' : '10px'}}>
            {canModify && onToggleSelect && (
                <div style={{position: 'absolute', top: '10px', right: '10px'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                        <input
                            type="checkbox"
                            checked={isSelected || false}
                            onChange={() => onToggleSelect(intervento.id)}
                        />
                        <span style={{fontSize: '0.9em'}}>Seleziona</span>
                    </label>
                </div>
            )}
            <table>
                <tbody>
                    <tr>
                        <td><strong>Data</strong></td>
                        <td>{formatDate(intervento.data_intervento_effettivo)}</td>
                    </tr>
                    <tr>
                        <td><strong>Tecnico</strong></td>
                        <td>{tecnicoNome}</td>
                    </tr>
                    <tr>
                        <td><strong>N. Tecnici</strong></td>
                        <td>{intervento.numero_tecnici || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Tipo</strong></td>
                        <td>{intervento.tipo_intervento || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Ore Lavoro</strong></td>
                        <td>{intervento.ore_lavoro_effettive || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Ore Viaggio</strong></td>
                        <td>{intervento.ore_viaggio || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Km</strong></td>
                        <td>{intervento.km_percorsi || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Spese</strong></td>
                        <td>
                            {intervento.vitto && 'Vitto '}
                            {intervento.autostrada && 'Autostrada '}
                            {intervento.alloggio && 'Alloggio'}
                            {(!intervento.vitto && !intervento.autostrada && !intervento.alloggio) && '-'}
                        </td>
                    </tr>
                </tbody>
            </table>
            <p><strong>Descrizione Attività:</strong></p>
            <p>{intervento.descrizione_attivita_svolta_intervento || '-'}</p>
            <p><strong>Osservazioni:</strong></p>
            <p>{intervento.osservazioni_intervento || '-'}</p>
            {intervento.interventi_attivita_standard?.length > 0 && (
                <div style={{marginTop: '15px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px'}}>
                    <h5 style={{marginTop: 0, marginBottom: '10px'}}>Attività Standard Eseguite:</h5>
                    <ul style={{margin: 0, paddingLeft: '20px'}}>
                        {intervento.interventi_attivita_standard.map(att => (
                            <li key={att.id} style={{marginBottom: '8px'}}>
                                <strong>{att.codice_attivita}</strong>: {att.descrizione}
                                <br />
                                <span style={{fontSize: '0.9em', color: '#555'}}>
                                    Quantità: {att.quantita} {att.unita_misura}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {canModify ? (
                <div className="actions" style={{ marginTop: '0.5rem' }}>
                    <button
                        className="button secondary small"
                        onClick={() => onEdit && onEdit(intervento)}
                    >
                        Modifica
                    </button>
                    <button
                        className="button danger small"
                        onClick={() => onDelete && onDelete(intervento.id)}
                        style={{ marginLeft: '5px' }}
                    >
                        Elimina
                    </button>
                </div>
            ) : (
                onView && (
                    <div className="actions" style={{ marginTop: '0.5rem' }}>
                        <button
                            className="button secondary small"
                            onClick={() => onView(intervento)}
                        >
                            Visualizza
                        </button>
                    </div>
                )
            )}
        </div>
    );
}

export default InterventoCard;
