import React from 'react';

function InterventoCard({ intervento, canModify, onEdit, onDelete, onView }) {
    if (!intervento) return null;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
    const tecnicoNome = intervento.tecnici
        ? `${intervento.tecnici.nome} ${intervento.tecnici.cognome}`
        : 'N/D';
    return (
        <div className="intervento-card">
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
