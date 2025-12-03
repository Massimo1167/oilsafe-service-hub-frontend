import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PianificazioniPage.css';

function PianificazioniPage({ userRole }) {
    const navigate = useNavigate();

    const pianificazioni = [
        {
            title: 'Programmazione Settimanale',
            description: 'Vista tabellare per tecnici e giorni (formato Excel)',
            route: '/programmazione-settimanale',
            icon: '📋',
            roles: ['admin', 'manager', 'user']
        },
        {
            title: 'Gestione Pianificazione',
            description: 'Calendario con visualizzazione e gestione pianificazioni',
            route: '/gestione-pianificazione',
            icon: '📆',
            roles: ['admin', 'manager', 'user']
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
