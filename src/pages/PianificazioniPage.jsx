import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PianificazioniPage.css';

function PianificazioniPage({ userRole }) {
    const navigate = useNavigate();

    const pianificazioni = [
        {
            title: 'Storico Interventi',
            description: 'Visualizza interventi passati su calendario',
            route: '/fogli-assistenza/calendario',
            icon: '📅',
            roles: ['admin', 'manager', 'user']
        },
        {
            title: 'Calendario Pianificazioni',
            description: 'Consulta le pianificazioni future',
            route: '/calendario-pianificazioni',
            icon: '📆',
            roles: ['admin', 'manager', 'user']
        },
        {
            title: 'Gestione Pianificazioni',
            description: 'Crea e modifica pianificazioni',
            route: '/pianificazioni-gestione',
            icon: '⚙️',
            roles: ['admin', 'manager']
        }
    ];

    // Filtra in base al ruolo utente
    const pianificazioniFiltrate = pianificazioni.filter(p =>
        p.roles.includes(userRole)
    );

    return (
        <div className="pianificazioni-container">
            <h1>Pianificazioni</h1>
            <p className="pianificazioni-subtitle">
                Seleziona una sezione per gestire le pianificazioni
            </p>

            <div className="pianificazioni-grid">
                {pianificazioniFiltrate.map((pianificazione, index) => (
                    <div
                        key={index}
                        className="pianificazione-card"
                        onClick={() => navigate(pianificazione.route)}
                    >
                        <div className="pianificazione-card-icon">{pianificazione.icon}</div>
                        <h3 className="pianificazione-card-title">{pianificazione.title}</h3>
                        <p className="pianificazione-card-description">{pianificazione.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PianificazioniPage;
