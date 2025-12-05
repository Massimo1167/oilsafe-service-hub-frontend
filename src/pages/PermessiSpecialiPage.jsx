import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './PermessiSpecialiPage.css';

/**
 * Pagina per gestione permessi speciali (solo per Admin)
 * Permette di assegnare/rimuovere permessi granulari agli utenti
 * come force_stato_rollback per recovery emergenze
 */
function PermessiSpecialiPage({ session }) {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const userRole = (session?.user?.role || '').trim().toLowerCase();

    // Solo admin possono accedere
    if (userRole !== 'admin') {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('id, email, full_name, role, permessi_speciali, created_at')
                .order('email');

            if (fetchError) throw fetchError;

            setProfiles(data || []);
        } catch (err) {
            console.error('Errore caricamento profili:', err);
            setError('Impossibile caricare i profili utente: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = async (profileId, permission) => {
        try {
            setError(null);
            setSuccessMessage('');

            // Trova il profilo corrente
            const profile = profiles.find(p => p.id === profileId);
            if (!profile) {
                throw new Error('Profilo non trovato');
            }

            // Toggle del permesso
            const currentPermissions = profile.permessi_speciali || {};
            const newValue = !currentPermissions[permission];

            const updatedPermissions = {
                ...currentPermissions,
                [permission]: newValue
            };

            // Update nel database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    permessi_speciali: updatedPermissions,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profileId);

            if (updateError) throw updateError;

            // Aggiorna stato locale
            setProfiles(prev => prev.map(p =>
                p.id === profileId
                    ? { ...p, permessi_speciali: updatedPermissions }
                    : p
            ));

            setSuccessMessage(
                `Permesso "${permission}" ${newValue ? 'assegnato a' : 'rimosso da'} ${profile.email}`
            );

            // Nascondi messaggio dopo 3 secondi
            setTimeout(() => setSuccessMessage(''), 3000);

        } catch (err) {
            console.error('Errore aggiornamento permesso:', err);
            setError('Impossibile aggiornare il permesso: ' + err.message);
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin': return 'role-badge role-admin';
            case 'manager': return 'role-badge role-manager';
            case 'head': return 'role-badge role-head';
            case 'user': return 'role-badge role-user';
            default: return 'role-badge';
        }
    };

    if (loading) {
        return (
            <div className="permessi-speciali-page">
                <h2>Caricamento...</h2>
            </div>
        );
    }

    return (
        <div className="permessi-speciali-page">
            <div className="page-header">
                <h2>Gestione Permessi Speciali</h2>
                <Link to="/" className="button secondary">← Torna alla Dashboard</Link>
            </div>

            <div className="info-box">
                <h3>ℹ️ Informazioni sui Permessi Speciali</h3>
                <p>
                    I permessi speciali permettono operazioni critiche che richiedono autorizzazione esplicita.
                </p>
                <ul>
                    <li>
                        <strong>force_stato_rollback:</strong> Permette di forzare il ritorno indietro di un
                        foglio da stati avanzati (Consuntivato, Fatturato, etc.) in caso di errori gravi.
                        Tutte le operazioni sono tracciate nei log per audit.
                    </li>
                </ul>
                <p className="warning-text">
                    ⚠️ <strong>ATTENZIONE:</strong> Assegna questi permessi solo a personale senior di fiducia.
                    Ogni utilizzo è registrato nel sistema.
                </p>
            </div>

            {error && (
                <div className="error-box">
                    <strong>Errore:</strong> {error}
                </div>
            )}

            {successMessage && (
                <div className="success-box">
                    {successMessage}
                </div>
            )}

            <div className="profiles-table-container">
                <table className="profiles-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Nome</th>
                            <th>Ruolo</th>
                            <th>Force Rollback Stato</th>
                            <th>Data Creazione</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profiles.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                    Nessun profilo trovato
                                </td>
                            </tr>
                        ) : (
                            profiles.map(profile => {
                                const hasRollbackPermission = profile.permessi_speciali?.force_stato_rollback || false;
                                const isCurrentUser = profile.id === session?.user?.id;

                                return (
                                    <tr key={profile.id} className={isCurrentUser ? 'current-user-row' : ''}>
                                        <td>
                                            {profile.email}
                                            {isCurrentUser && <span className="you-badge">TU</span>}
                                        </td>
                                        <td>{profile.full_name || '-'}</td>
                                        <td>
                                            <span className={getRoleBadgeClass(profile.role)}>
                                                {profile.role}
                                            </span>
                                        </td>
                                        <td>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={hasRollbackPermission}
                                                    onChange={() => togglePermission(profile.id, 'force_stato_rollback')}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </td>
                                        <td>
                                            {profile.created_at
                                                ? new Date(profile.created_at).toLocaleDateString('it-IT')
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="info-box" style={{ marginTop: '30px' }}>
                <h3>📊 Statistiche Utilizzo</h3>
                <p>
                    Per visualizzare lo storico utilizzo dei permessi speciali, consulta la tabella
                    <code>log_operazioni_critiche</code> nel database o utilizza le funzioni SQL:
                </p>
                <ul>
                    <li><code>get_users_with_special_permissions()</code> - Lista utenti con permessi attivi</li>
                    <li><code>report_utilizzo_permessi_speciali(data_inizio, data_fine)</code> - Report utilizzi per periodo</li>
                </ul>
            </div>
        </div>
    );
}

export default PermessiSpecialiPage;
