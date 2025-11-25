import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AnagrafichePage.css';

function AnagrafichePage() {
    const navigate = useNavigate();

    const anagrafiche = [
        {
            title: 'Clienti',
            description: 'Gestione anagrafica clienti',
            route: '/clienti',
            icon: '👥'
        },
        {
            title: 'Tecnici',
            description: 'Gestione tecnici e personale',
            route: '/tecnici',
            icon: '🔧'
        },
        {
            title: 'Reparti',
            description: 'Gestione reparti e dipartimenti',
            route: '/reparti',
            icon: '🏢'
        },
        {
            title: 'Commesse',
            description: 'Gestione commesse di lavoro',
            route: '/commesse',
            icon: '📋'
        },
        {
            title: 'Ordini Interni',
            description: 'Gestione ordini interni',
            route: '/ordini',
            icon: '📦'
        },
        {
            title: 'Mansioni',
            description: 'Gestione mansioni personale',
            route: '/mansioni',
            icon: '💼'
        },
        {
            title: 'Unità di Misura',
            description: 'Gestione unità di misura',
            route: '/unita-misura',
            icon: '📏'
        },
        {
            title: 'Attività Standard',
            description: 'Gestione attività standard',
            route: '/attivita-standard',
            icon: '✓'
        },
        {
            title: 'Mezzi di Trasporto',
            description: 'Gestione mezzi e veicoli',
            route: '/mezzi',
            icon: '🚗'
        }
    ];

    return (
        <div className="anagrafiche-container">
            <h1>Gestione Anagrafiche</h1>
            <p className="anagrafiche-subtitle">
                Seleziona una sezione per gestire le relative informazioni
            </p>

            <div className="anagrafiche-grid">
                {anagrafiche.map((anagrafica, index) => (
                    <div
                        key={index}
                        className="anagrafica-card"
                        onClick={() => navigate(anagrafica.route)}
                    >
                        <div className="anagrafica-card-icon">{anagrafica.icon}</div>
                        <h3 className="anagrafica-card-title">{anagrafica.title}</h3>
                        <p className="anagrafica-card-description">{anagrafica.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AnagrafichePage;
