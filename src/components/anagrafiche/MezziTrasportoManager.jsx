/**
 * Manager per l'anagrafica dei mezzi di trasporto aziendali
 * Permette CRUD completo, import/export CSV/XLSX, ricerca e filtri
 * Accessibile solo a Manager e Admin
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import './MezziTrasportoManager.css';

function MezziTrasportoManager({ session, onDataChanged }) {
    const [mezzi, setMezzi] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        targa: '',
        tipo_mezzo: 'Furgone',
        modello: '',
        marca: '',
        anno_immatricolazione: '',
        note: '',
        attivo: true,
    });

    // Search and filter
    const [searchText, setSearchText] = useState('');
    const [minSearchLength] = useState(3);
    const [unlockSearch, setUnlockSearch] = useState(false);
    const [showOnlyActive, setShowOnlyActive] = useState(true);

    const userRole = (session?.user?.role || '').trim().toLowerCase();
    const canManage = userRole === 'admin' || userRole === 'manager';

    // Fetch mezzi from database
    const fetchMezzi = useCallback(async () => {
        try {
            setPageLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('mezzi_trasporto')
                .select('*')
                .order('targa', { ascending: true });

            if (fetchError) throw fetchError;

            setMezzi(data || []);
        } catch (err) {
            console.error('Errore nel caricamento mezzi:', err);
            setError('Impossibile caricare i mezzi di trasporto: ' + err.message);
        } finally {
            setPageLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMezzi();
    }, [fetchMezzi]);

    // Filtered mezzi
    const mezziFiltrati = mezzi.filter(mezzo => {
        // Filtro attivo/non attivo
        if (showOnlyActive && !mezzo.attivo) return false;

        // Filtro ricerca testo
        if (searchText.length >= minSearchLength || unlockSearch) {
            const search = searchText.toLowerCase();
            return (
                mezzo.targa?.toLowerCase().includes(search) ||
                mezzo.tipo_mezzo?.toLowerCase().includes(search) ||
                mezzo.modello?.toLowerCase().includes(search) ||
                mezzo.marca?.toLowerCase().includes(search)
            );
        }

        return true;
    });

    // Handlers
    const handleAdd = () => {
        setEditingId(null);
        setFormData({
            targa: '',
            tipo_mezzo: 'Furgone',
            modello: '',
            marca: '',
            anno_immatricolazione: '',
            note: '',
            attivo: true,
        });
        setShowForm(true);
    };

    const handleEdit = (mezzo) => {
        setEditingId(mezzo.id);
        setFormData({
            targa: mezzo.targa || '',
            tipo_mezzo: mezzo.tipo_mezzo || 'Furgone',
            modello: mezzo.modello || '',
            marca: mezzo.marca || '',
            anno_immatricolazione: mezzo.anno_immatricolazione || '',
            note: mezzo.note || '',
            attivo: mezzo.attivo !== undefined ? mezzo.attivo : true,
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            targa: '',
            tipo_mezzo: 'Furgone',
            modello: '',
            marca: '',
            anno_immatricolazione: '',
            note: '',
            attivo: true,
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.targa || !formData.tipo_mezzo) {
            alert('Targa e Tipo Mezzo sono obbligatori');
            return;
        }

        try {
            setLoadingActions(true);
            setError(null);

            const mezzoData = {
                targa: formData.targa.trim().toUpperCase(),
                tipo_mezzo: formData.tipo_mezzo.trim(),
                modello: formData.modello?.trim() || null,
                marca: formData.marca?.trim() || null,
                anno_immatricolazione: formData.anno_immatricolazione ? parseInt(formData.anno_immatricolazione) : null,
                note: formData.note?.trim() || null,
                attivo: formData.attivo,
            };

            if (editingId) {
                // Update
                const { error: updateError } = await supabase
                    .from('mezzi_trasporto')
                    .update(mezzoData)
                    .eq('id', editingId);

                if (updateError) throw updateError;

                setSuccessMessage('Mezzo aggiornato con successo');
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('mezzi_trasporto')
                    .insert([mezzoData]);

                if (insertError) throw insertError;

                setSuccessMessage('Mezzo creato con successo');
            }

            await fetchMezzi();
            if (onDataChanged) onDataChanged();
            handleCancel();
            setTimeout(() => setSuccessMessage(''), 3000);

        } catch (err) {
            console.error('Errore salvataggio mezzo:', err);
            setError('Errore nel salvataggio: ' + err.message);
        } finally {
            setLoadingActions(false);
        }
    };

    const handleDelete = async (id, targa) => {
        if (!window.confirm(`Eliminare il mezzo ${targa}?\n\nATTENZIONE: Verranno eliminate anche tutte le pianificazioni associate.`)) {
            return;
        }

        try {
            setLoadingActions(true);
            setError(null);

            const { error: deleteError } = await supabase
                .from('mezzi_trasporto')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            setSuccessMessage('Mezzo eliminato con successo');
            await fetchMezzi();
            if (onDataChanged) onDataChanged();
            setTimeout(() => setSuccessMessage(''), 3000);

        } catch (err) {
            console.error('Errore eliminazione mezzo:', err);
            setError('Errore nell\'eliminazione: ' + err.message);
        } finally {
            setLoadingActions(false);
        }
    };

    // Export to Excel
    const handleExportExcel = () => {
        const exportData = mezziFiltrati.map(m => ({
            Targa: m.targa,
            Tipo: m.tipo_mezzo,
            Modello: m.modello || '',
            Marca: m.marca || '',
            Anno: m.anno_immatricolazione || '',
            Note: m.note || '',
            Attivo: m.attivo ? 'Sì' : 'No',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mezzi');
        XLSX.writeFile(wb, 'mezzi_trasporto.xlsx');
    };

    // Export to CSV
    const handleExportCSV = () => {
        const exportData = mezziFiltrati.map(m => ({
            Targa: m.targa,
            Tipo: m.tipo_mezzo,
            Modello: m.modello || '',
            Marca: m.marca || '',
            Anno: m.anno_immatricolazione || '',
            Note: m.note || '',
            Attivo: m.attivo ? 'Sì' : 'No',
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mezzi_trasporto.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    // Import from CSV
    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                try {
                    setLoadingActions(true);
                    setError(null);

                    const mezziToImport = results.data
                        .filter(row => row.Targa && row.Tipo)
                        .map(row => ({
                            targa: row.Targa.trim().toUpperCase(),
                            tipo_mezzo: row.Tipo.trim(),
                            modello: row.Modello?.trim() || null,
                            marca: row.Marca?.trim() || null,
                            anno_immatricolazione: row.Anno ? parseInt(row.Anno) : null,
                            note: row.Note?.trim() || null,
                            attivo: row.Attivo?.toLowerCase() !== 'no',
                        }));

                    if (mezziToImport.length === 0) {
                        alert('Nessun mezzo valido trovato nel file CSV');
                        return;
                    }

                    const { error: importError } = await supabase
                        .from('mezzi_trasporto')
                        .insert(mezziToImport);

                    if (importError) throw importError;

                    setSuccessMessage(`${mezziToImport.length} mezzi importati con successo`);
                    await fetchMezzi();
                    if (onDataChanged) onDataChanged();
                    setTimeout(() => setSuccessMessage(''), 3000);

                } catch (err) {
                    console.error('Errore import CSV:', err);
                    setError('Errore nell\'importazione: ' + err.message);
                } finally {
                    setLoadingActions(false);
                    e.target.value = '';
                }
            },
            error: (err) => {
                console.error('Errore parsing CSV:', err);
                setError('Errore nel parsing del file CSV');
                e.target.value = '';
            }
        });
    };

    if (!canManage) {
        return (
            <div className="manager-container">
                <p>Non hai i permessi per gestire i mezzi di trasporto.</p>
            </div>
        );
    }

    if (pageLoading) {
        return <div className="manager-container"><p>Caricamento mezzi...</p></div>;
    }

    return (
        <div className="manager-container">
            <h1>Gestione Mezzi di Trasporto</h1>

            {/* Messages */}
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}

            {/* Toolbar */}
            <div className="manager-toolbar">
                <button onClick={handleAdd} className="button primary" disabled={loadingActions}>
                    + Nuovo Mezzo
                </button>
                <button onClick={handleExportExcel} className="button secondary" disabled={loadingActions}>
                    Esporta Excel
                </button>
                <button onClick={handleExportCSV} className="button secondary" disabled={loadingActions}>
                    Esporta CSV
                </button>
                <label className="button secondary" style={{ cursor: 'pointer' }}>
                    Importa CSV
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportCSV}
                        style={{ display: 'none' }}
                        disabled={loadingActions}
                    />
                </label>
            </div>

            {/* Filters */}
            <div className="manager-filters">
                <div className="filter-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={showOnlyActive}
                            onChange={(e) => setShowOnlyActive(e.target.checked)}
                        />
                        Mostra solo mezzi attivi
                    </label>
                </div>
                <div className="filter-group">
                    <input
                        type="text"
                        placeholder="Cerca per targa, tipo, modello, marca..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="search-input"
                    />
                    {searchText.length > 0 && searchText.length < minSearchLength && !unlockSearch && (
                        <small style={{ color: '#999' }}>
                            (minimo {minSearchLength} caratteri o{' '}
                            <button
                                type="button"
                                onClick={() => setUnlockSearch(true)}
                                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                            >
                                sblocca ricerca
                            </button>
                            )
                        </small>
                    )}
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="form-card">
                    <h2>{editingId ? 'Modifica Mezzo' : 'Nuovo Mezzo'}</h2>
                    <form onSubmit={handleSave}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Targa *</label>
                                <input
                                    type="text"
                                    value={formData.targa}
                                    onChange={(e) => setFormData({ ...formData, targa: e.target.value })}
                                    required
                                    placeholder="AB123CD"
                                    maxLength={10}
                                />
                            </div>
                            <div className="form-group">
                                <label>Tipo Mezzo *</label>
                                <select
                                    value={formData.tipo_mezzo}
                                    onChange={(e) => setFormData({ ...formData, tipo_mezzo: e.target.value })}
                                    required
                                >
                                    <option value="Furgone">Furgone</option>
                                    <option value="Auto">Auto</option>
                                    <option value="Camion">Camion</option>
                                    <option value="Moto">Moto</option>
                                    <option value="Altro">Altro</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Marca</label>
                                <input
                                    type="text"
                                    value={formData.marca}
                                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                    placeholder="Es: Fiat"
                                />
                            </div>
                            <div className="form-group">
                                <label>Modello</label>
                                <input
                                    type="text"
                                    value={formData.modello}
                                    onChange={(e) => setFormData({ ...formData, modello: e.target.value })}
                                    placeholder="Es: Ducato"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Anno Immatricolazione</label>
                                <input
                                    type="number"
                                    value={formData.anno_immatricolazione}
                                    onChange={(e) => setFormData({ ...formData, anno_immatricolazione: e.target.value })}
                                    placeholder="2020"
                                    min="1900"
                                    max={new Date().getFullYear() + 1}
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.attivo}
                                        onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                                    />
                                    {' '}Attivo
                                </label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Note</label>
                            <textarea
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                rows="3"
                                placeholder="Note aggiuntive..."
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="button primary" disabled={loadingActions}>
                                {loadingActions ? 'Salvataggio...' : 'Salva'}
                            </button>
                            <button type="button" onClick={handleCancel} className="button secondary" disabled={loadingActions}>
                                Annulla
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            <div className="table-container">
                <p className="results-count">
                    {mezziFiltrati.length} {mezziFiltrati.length === 1 ? 'mezzo trovato' : 'mezzi trovati'}
                </p>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Targa</th>
                            <th>Tipo</th>
                            <th>Marca</th>
                            <th>Modello</th>
                            <th>Anno</th>
                            <th>Note</th>
                            <th>Stato</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mezziFiltrati.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                                    Nessun mezzo trovato
                                </td>
                            </tr>
                        ) : (
                            mezziFiltrati.map(mezzo => (
                                <tr key={mezzo.id}>
                                    <td><strong>{mezzo.targa}</strong></td>
                                    <td>{mezzo.tipo_mezzo}</td>
                                    <td>{mezzo.marca || '-'}</td>
                                    <td>{mezzo.modello || '-'}</td>
                                    <td>{mezzo.anno_immatricolazione || '-'}</td>
                                    <td>{mezzo.note ? (mezzo.note.length > 50 ? mezzo.note.substring(0, 50) + '...' : mezzo.note) : '-'}</td>
                                    <td>
                                        <span className={`status-badge ${mezzo.attivo ? 'status-active' : 'status-inactive'}`}>
                                            {mezzo.attivo ? 'Attivo' : 'Non attivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleEdit(mezzo)}
                                            className="button small secondary"
                                            disabled={loadingActions}
                                        >
                                            Modifica
                                        </button>
                                        <button
                                            onClick={() => handleDelete(mezzo.id, mezzo.targa)}
                                            className="button small danger"
                                            disabled={loadingActions}
                                            style={{ marginLeft: '5px' }}
                                        >
                                            Elimina
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default MezziTrasportoManager;
