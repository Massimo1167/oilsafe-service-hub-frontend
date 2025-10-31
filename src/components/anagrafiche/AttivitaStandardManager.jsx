/**
 * Manager per gestire l'anagrafica delle attività standard per cliente.
 * Accessibile solo da admin e manager.
 * Permette di creare, modificare ed eliminare attività standard con prezzi predefiniti.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';

function AttivitaStandardManager({ session, onDataChanged }) {
    const [attivita, setAttivita] = useState([]);
    const [clienti, setClienti] = useState([]);
    const [unitaMisura, setUnitaMisura] = useState([]); // Lista unità di misura
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Stati per filtro clienti
    const [clienteFilter, setClienteFilter] = useState('');

    // Stati per selezione multipla e cancellazione bulk
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Form states
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formCodice, setFormCodice] = useState('');
    const [formNormativa, setFormNormativa] = useState('');
    const [formDescrizione, setFormDescrizione] = useState('');
    const [formUnitaMisuraId, setFormUnitaMisuraId] = useState(''); // Cambiato da TEXT a ID
    const [formCostoUnitario, setFormCostoUnitario] = useState('');
    const [formAttivo, setFormAttivo] = useState(true);

    const userRole = (session?.user?.role || '').trim().toLowerCase();

    // Filtro clienti con useMemo
    const clientiFiltrati = useMemo(() => {
        if (!clienteFilter.trim()) return clienti;
        const filterLower = clienteFilter.toLowerCase();
        return clienti.filter(c =>
            c.nome_azienda.toLowerCase().includes(filterLower)
        );
    }, [clienti, clienteFilter]);

    // Fetch clienti e unità di misura
    useEffect(() => {
        fetchClienti();
        fetchUnitaMisura();
    }, []);

    const fetchUnitaMisura = async () => {
        try {
            const { data, error } = await supabase
                .from('unita_misura')
                .select('id, codice, descrizione')
                .eq('attivo', true)
                .order('codice');

            if (error) throw error;
            setUnitaMisura(data || []);
        } catch (err) {
            console.error('Errore caricamento unità di misura:', err);
            setError(err.message);
        }
    };

    // Fetch attività quando cambia il cliente selezionato
    useEffect(() => {
        if (selectedClienteId) {
            fetchAttivita();
        } else {
            setAttivita([]);
        }
        // Reset selezioni quando cambia cliente
        setSelectedIds(new Set());
    }, [selectedClienteId]);

    const fetchClienti = async () => {
        try {
            const { data, error } = await supabase
                .from('clienti')
                .select('id, nome_azienda')
                .order('nome_azienda');

            if (error) throw error;
            setClienti(data || []);
        } catch (err) {
            console.error('Errore caricamento clienti:', err);
            setError(err.message);
        }
    };

    const fetchAttivita = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('attivita_standard_clienti')
                .select(`
                    *,
                    unita_misura (
                        id,
                        codice,
                        descrizione
                    )
                `)
                .eq('cliente_id', selectedClienteId)
                .order('codice_attivita');

            if (error) throw error;
            setAttivita(data || []);
        } catch (err) {
            console.error('Errore caricamento attività:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        if (!selectedClienteId) {
            alert('Seleziona un cliente prima di aggiungere un\'attività');
            return;
        }
        resetForm();
        setEditingId(null);
        setShowModal(true);
    };

    const handleEdit = (attivita) => {
        setEditingId(attivita.id);
        setFormCodice(attivita.codice_attivita);
        setFormNormativa(attivita.normativa || '');
        setFormDescrizione(attivita.descrizione);
        setFormUnitaMisuraId(attivita.unita_misura_id || '');
        setFormCostoUnitario(attivita.costo_unitario.toString());
        setFormAttivo(attivita.attivo);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Eliminare questa attività standard? Questa azione è irreversibile.')) return;

        setError(null);
        try {
            const { error } = await supabase
                .from('attivita_standard_clienti')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccessMessage('Attività eliminata con successo');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchAttivita();
            if (onDataChanged) onDataChanged();
        } catch (err) {
            console.error('Errore eliminazione attività:', err);
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validazioni
        if (!formCodice.trim()) {
            setError('Codice attività obbligatorio');
            return;
        }
        if (!formDescrizione.trim()) {
            setError('Descrizione obbligatoria');
            return;
        }
        if (!formUnitaMisuraId) {
            setError('Unità di misura obbligatoria');
            return;
        }
        const costoNum = parseFloat(formCostoUnitario);
        if (isNaN(costoNum) || costoNum < 0) {
            setError('Costo unitario deve essere >= 0');
            return;
        }

        const payload = {
            cliente_id: selectedClienteId,
            codice_attivita: formCodice.trim(),
            normativa: formNormativa.trim() || null,
            descrizione: formDescrizione.trim(),
            unita_misura_id: formUnitaMisuraId,
            costo_unitario: costoNum,
            attivo: formAttivo
        };

        try {
            if (editingId) {
                // UPDATE
                const { error } = await supabase
                    .from('attivita_standard_clienti')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                setSuccessMessage('Attività modificata con successo');
            } else {
                // INSERT
                const { error } = await supabase
                    .from('attivita_standard_clienti')
                    .insert([payload]);

                if (error) {
                    if (error.code === '23505') { // UNIQUE constraint
                        throw new Error('Codice attività già esistente per questo cliente');
                    }
                    throw error;
                }
                setSuccessMessage('Attività creata con successo');
            }

            setTimeout(() => setSuccessMessage(''), 3000);
            setShowModal(false);
            fetchAttivita();
            if (onDataChanged) onDataChanged();
        } catch (err) {
            console.error('Errore salvataggio attività:', err);
            setError(err.message);
        }
    };

    const resetForm = () => {
        setFormCodice('');
        setFormNormativa('');
        setFormDescrizione('');
        setFormUnitaMisuraId('');
        setFormCostoUnitario('');
        setFormAttivo(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
        setEditingId(null);
        setError(null);
    };

    // ========== EXPORT EXCEL ==========
    const handleExportExcel = () => {
        if (attivita.length === 0) {
            alert('Nessuna attività da esportare');
            return;
        }

        // Trova nome cliente per nome file
        const cliente = clienti.find(c => c.id === selectedClienteId);
        const nomeCliente = cliente ? cliente.nome_azienda.replace(/[^a-zA-Z0-9]/g, '_') : 'cliente';
        const dataOggi = new Date().toISOString().split('T')[0];

        // Prepara dati per Excel
        const excelData = attivita.map(att => ({
            'Codice Attività': att.codice_attivita,
            'Normativa': att.normativa || '',
            'Descrizione': att.descrizione,
            'Unità di Misura': att.unita_misura?.codice || '',
            'Costo Unitario (€)': parseFloat(att.costo_unitario).toFixed(2),
            'Attivo': att.attivo ? 'Sì' : 'No'
        }));

        // Crea workbook e worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attività Standard');

        // Download file
        XLSX.writeFile(wb, `attivita_standard_${nomeCliente}_${dataOggi}.xlsx`);

        setSuccessMessage(`Esportate ${attivita.length} attività in Excel`);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    // ========== IMPORT EXCEL ==========
    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError(null);
        setLoading(true);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        setError('File Excel vuoto');
                        setLoading(false);
                        return;
                    }

                    // Validazione colonne obbligatorie
                    const firstRow = jsonData[0];
                    const requiredCols = ['Codice Attività', 'Descrizione', 'Unità di Misura', 'Costo Unitario (€)'];
                    const missingCols = requiredCols.filter(col => !(col in firstRow));

                    if (missingCols.length > 0) {
                        setError(`Colonne obbligatorie mancanti: ${missingCols.join(', ')}`);
                        setLoading(false);
                        return;
                    }

                    // Importa righe
                    let inserite = 0;
                    let duplicate = 0;
                    let errori = 0;

                    for (const row of jsonData) {
                        const codice = row['Codice Attività']?.toString().trim();
                        const descrizione = row['Descrizione']?.toString().trim();
                        const unitaMisuraCodice = row['Unità di Misura']?.toString().trim();
                        const costoStr = row['Costo Unitario (€)']?.toString().trim();
                        const normativa = row['Normativa']?.toString().trim() || null;
                        const attivoStr = row['Attivo']?.toString().trim();

                        // Validazioni
                        if (!codice || !descrizione || !unitaMisuraCodice) {
                            errori++;
                            continue;
                        }

                        const costo = parseFloat(costoStr);
                        if (isNaN(costo) || costo < 0) {
                            errori++;
                            continue;
                        }

                        // Lookup unità di misura per codice
                        const um = unitaMisura.find(u => u.codice === unitaMisuraCodice);
                        if (!um) {
                            console.warn(`UM non trovata: ${unitaMisuraCodice}`);
                            errori++;
                            continue;
                        }

                        const attivo = attivoStr ? (attivoStr.toLowerCase() === 'sì' || attivoStr.toLowerCase() === 'si') : true;

                        const payload = {
                            cliente_id: selectedClienteId,
                            codice_attivita: codice,
                            normativa: normativa,
                            descrizione: descrizione,
                            unita_misura_id: um.id,
                            costo_unitario: costo,
                            attivo: attivo
                        };

                        const { error } = await supabase
                            .from('attivita_standard_clienti')
                            .insert([payload]);

                        if (error) {
                            if (error.code === '23505') { // UNIQUE constraint
                                duplicate++;
                            } else {
                                errori++;
                            }
                        } else {
                            inserite++;
                        }
                    }

                    // Report finale
                    let report = `Import completato: ${inserite} inserite`;
                    if (duplicate > 0) report += `, ${duplicate} duplicate (saltate)`;
                    if (errori > 0) report += `, ${errori} errori`;

                    setSuccessMessage(report);
                    setTimeout(() => setSuccessMessage(''), 5000);
                    fetchAttivita();
                    if (onDataChanged) onDataChanged();

                } catch (err) {
                    console.error('Errore parsing Excel:', err);
                    setError('Errore lettura file Excel: ' + err.message);
                } finally {
                    setLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            console.error('Errore import Excel:', err);
            setError(err.message);
            setLoading(false);
        }

        // Reset input file
        e.target.value = '';
    };

    // ========== SELEZIONE MULTIPLA ==========
    const handleToggleSelectAll = () => {
        if (selectedIds.size === attivita.length) {
            // Deseleziona tutto
            setSelectedIds(new Set());
        } else {
            // Seleziona tutto
            setSelectedIds(new Set(attivita.map(att => att.id)));
        }
    };

    const handleToggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // ========== CANCELLAZIONE BULK ==========
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        const conferma = window.confirm(
            `Eliminare ${selectedIds.size} attività selezionate? Questa azione è irreversibile.`
        );
        if (!conferma) return;

        setError(null);
        setLoading(true);

        let eliminate = 0;
        let errori = 0;

        for (const id of selectedIds) {
            try {
                const { error } = await supabase
                    .from('attivita_standard_clienti')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                eliminate++;
            } catch (err) {
                console.error('Errore eliminazione attività:', err);
                errori++;
            }
        }

        setLoading(false);

        // Report finale
        let report = `Eliminate ${eliminate} attività`;
        if (errori > 0) report += ` (${errori} errori)`;

        setSuccessMessage(report);
        setTimeout(() => setSuccessMessage(''), 3000);

        setSelectedIds(new Set());
        fetchAttivita();
        if (onDataChanged) onDataChanged();
    };

    if (userRole !== 'admin' && userRole !== 'manager') {
        return <p>Accesso negato. Solo admin e manager possono gestire le attività standard.</p>;
    }

    return (
        <div>
            <h2>Gestione Attività Standard per Cliente</h2>
            <p style={{color: '#666'}}>
                Crea e gestisci attività standard con prezzi predefiniti per contratti di manutenzione.
            </p>

            {error && <p style={{color: 'red', fontWeight: 'bold'}}>ERRORE: {error}</p>}
            {successMessage && <p style={{color: 'green', fontWeight: 'bold'}}>{successMessage}</p>}

            {/* Filtro e Selezione Cliente */}
            <div style={{marginBottom: '20px'}}>
                <div style={{marginBottom: '10px'}}>
                    <label htmlFor="filtroCliente" style={{marginRight: '10px', fontWeight: 'bold'}}>
                        Filtra Clienti:
                    </label>
                    <input
                        id="filtroCliente"
                        type="text"
                        value={clienteFilter}
                        onChange={(e) => setClienteFilter(e.target.value)}
                        placeholder="Cerca per nome azienda..."
                        style={{padding: '8px', minWidth: '300px', marginRight: '10px'}}
                    />
                    {clienteFilter && (
                        <button
                            onClick={() => setClienteFilter('')}
                            className="button small secondary"
                        >
                            Pulisci
                        </button>
                    )}
                    {clienteFilter && (
                        <span style={{marginLeft: '10px', color: '#666'}}>
                            ({clientiFiltrati.length} risultati)
                        </span>
                    )}
                </div>

                <div>
                    <label htmlFor="clienteSelect" style={{marginRight: '10px', fontWeight: 'bold'}}>
                        Seleziona Cliente:
                    </label>
                    <select
                        id="clienteSelect"
                        value={selectedClienteId}
                        onChange={(e) => setSelectedClienteId(e.target.value)}
                        style={{padding: '8px', minWidth: '300px'}}
                    >
                        <option value="">-- Seleziona un cliente --</option>
                        {clientiFiltrati.map(c => (
                            <option key={c.id} value={c.id}>{c.nome_azienda}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedClienteId && (
                <>
                    {/* Barra pulsanti */}
                    <div style={{marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'}}>
                        <button onClick={handleAdd} className="button primary">
                            Aggiungi Nuova Attività
                        </button>

                        {/* Export - solo se ci sono attività */}
                        {attivita.length > 0 && (
                            <button onClick={handleExportExcel} className="button">
                                Esporta Excel
                            </button>
                        )}

                        {/* Import - sempre disponibile per importazione massiva iniziale */}
                        <label style={{cursor: 'pointer'}}>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleImportExcel}
                                style={{display: 'none'}}
                            />
                            <span className="button">Importa Excel</span>
                        </label>

                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="button secondary"
                                style={{marginLeft: 'auto'}}
                            >
                                Elimina Selezionate ({selectedIds.size})
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <p>Caricamento attività...</p>
                    ) : attivita.length === 0 ? (
                        <p>Nessuna attività standard configurata per questo cliente.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th style={{width: '50px', textAlign: 'center'}}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === attivita.length && attivita.length > 0}
                                            onChange={handleToggleSelectAll}
                                            title="Seleziona/Deseleziona tutto"
                                        />
                                    </th>
                                    <th>Codice</th>
                                    <th>Descrizione</th>
                                    <th>Normativa</th>
                                    <th>U.M.</th>
                                    {userRole === 'admin' && <th>Costo Unitario</th>}
                                    <th>Attivo</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attivita.map(att => (
                                    <tr
                                        key={att.id}
                                        style={{
                                            backgroundColor: selectedIds.has(att.id) ? '#e3f2fd' : 'transparent'
                                        }}
                                    >
                                        <td style={{textAlign: 'center'}}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(att.id)}
                                                onChange={() => handleToggleSelect(att.id)}
                                            />
                                        </td>
                                        <td><strong>{att.codice_attivita}</strong></td>
                                        <td>{att.descrizione}</td>
                                        <td style={{fontSize: '0.9em', color: '#666'}}>
                                            {att.normativa || '-'}
                                        </td>
                                        <td>{att.unita_misura?.codice || '-'}</td>
                                        {userRole === 'admin' && (
                                            <td style={{textAlign: 'right'}}>
                                                €{parseFloat(att.costo_unitario).toFixed(2)}
                                            </td>
                                        )}
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '3px',
                                                backgroundColor: att.attivo ? '#d4edda' : '#f8d7da',
                                                color: att.attivo ? '#155724' : '#721c24',
                                                fontSize: '0.85em'
                                            }}>
                                                {att.attivo ? 'Sì' : 'No'}
                                            </span>
                                        </td>
                                        <td className="actions">
                                            <button
                                                onClick={() => handleEdit(att)}
                                                className="button small"
                                            >
                                                Modifica
                                            </button>
                                            <button
                                                onClick={() => handleDelete(att.id)}
                                                className="button small secondary"
                                                style={{marginLeft: '5px'}}
                                            >
                                                Elimina
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}

            {/* Modal Form */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        width: '600px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h3>{editingId ? 'Modifica Attività Standard' : 'Nuova Attività Standard'}</h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Codice Attività *
                                </label>
                                <input
                                    type="text"
                                    value={formCodice}
                                    onChange={(e) => setFormCodice(e.target.value)}
                                    required
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="es: MANT-001"
                                />
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Normativa (opzionale)
                                </label>
                                <input
                                    type="text"
                                    value={formNormativa}
                                    onChange={(e) => setFormNormativa(e.target.value)}
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="es: UNI EN 1234:2020"
                                />
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Descrizione *
                                </label>
                                <textarea
                                    value={formDescrizione}
                                    onChange={(e) => setFormDescrizione(e.target.value)}
                                    required
                                    rows="3"
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="Descrizione dettagliata dell'attività"
                                />
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Unità di Misura *
                                </label>
                                <select
                                    value={formUnitaMisuraId}
                                    onChange={(e) => setFormUnitaMisuraId(e.target.value)}
                                    required
                                    style={{width: '100%', padding: '8px'}}
                                >
                                    <option value="">-- Seleziona unità di misura --</option>
                                    {unitaMisura.map(um => (
                                        <option key={um.id} value={um.id}>
                                            {um.codice}{um.descrizione ? ` - ${um.descrizione}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <small style={{color: '#666', display: 'block', marginTop: '3px'}}>
                                    Seleziona un'unità di misura standardizzata. Gestisci le UM da Unità di Misura.
                                </small>
                            </div>

                            {userRole === 'admin' && (
                                <div style={{marginBottom: '15px'}}>
                                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                        Costo Unitario (€) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formCostoUnitario}
                                        onChange={(e) => setFormCostoUnitario(e.target.value)}
                                        required
                                        style={{width: '100%', padding: '8px'}}
                                        placeholder="0.00"
                                    />
                                </div>
                            )}

                            <div style={{marginBottom: '20px'}}>
                                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <input
                                        type="checkbox"
                                        checked={formAttivo}
                                        onChange={(e) => setFormAttivo(e.target.checked)}
                                    />
                                    <span style={{fontWeight: 'bold'}}>Attivo</span>
                                </label>
                            </div>

                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="button secondary"
                                >
                                    Annulla
                                </button>
                                <button type="submit" className="button primary">
                                    {editingId ? 'Salva Modifiche' : 'Crea Attività'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AttivitaStandardManager;
