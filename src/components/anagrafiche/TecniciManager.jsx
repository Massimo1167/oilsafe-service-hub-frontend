/**
 * Management component for technicians ("tecnici").
 * Provides CRUD operations with CSV/XLSX import-export via Supabase.
 * It is protected by user role checks coming from `App.jsx`.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

function TecniciManager({ session, mansioni, reparti, onDataChanged }) {
    const [tecnici, setTecnici] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [importProgress, setImportProgress] = useState('');
    const [filtroNome, setFiltroNome] = useState('');
    const [filtroCognome, setFiltroCognome] = useState('');
    const [ricercaSbloccata, setRicercaSbloccata] = useState(false);

    const [formNome, setFormNome] = useState('');
    const [formCognome, setFormCognome] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formUserId, setFormUserId] = useState('');
    const [formMansioneId, setFormMansioneId] = useState('');
    const [formRepartoId, setFormRepartoId] = useState('');
    const [formAbilitatoPianificazione, setFormAbilitatoPianificazione] = useState(true);
    const [editingTecnico, setEditingTecnico] = useState(null);
    const [users, setUsers] = useState([]);
    const [filterUser, setFilterUser] = useState('');
    const [filterMansione, setFilterMansione] = useState('');
    const [filterReparto, setFilterReparto] = useState('');

    const userRole = (session?.user?.role || '').trim().toLowerCase();
    const canManage = userRole === 'admin' || userRole === 'manager';
    const fileInputRef = useRef(null);
    const filteredUsers = useMemo(
        () => users.filter(u =>
            (u.username || '').toLowerCase().includes(filterUser.toLowerCase()) ||
            (u.full_name || '').toLowerCase().includes(filterUser.toLowerCase())
        ),
        [users, filterUser]
    );

    const filteredMansioni = useMemo(
        () => mansioni.filter(m =>
            (m.ruolo || '').toLowerCase().includes(filterMansione.toLowerCase()) ||
            (m.categoria || '').toLowerCase().includes(filterMansione.toLowerCase())
        ),
        [mansioni, filterMansione]
    );

    const filteredReparti = useMemo(
        () => reparti.filter(r =>
            (r.codice || '').toLowerCase().includes(filterReparto.toLowerCase()) ||
            (r.descrizione || '').toLowerCase().includes(filterReparto.toLowerCase())
        ),
        [reparti, filterReparto]
    );

    const fetchTecnici = async (nomeFiltro, cognomeFiltro) => {
        if (
            !ricercaSbloccata &&
            (!nomeFiltro || nomeFiltro.trim().length < 3) &&
            (!cognomeFiltro || cognomeFiltro.trim().length < 3)
        ) {
            setTecnici([]);
            setError('Inserire almeno 3 caratteri in uno dei filtri o sbloccare la ricerca.');
            setPageLoading(false);
            return;
        }
        setPageLoading(true);
        setError(null);
        let query = supabase.from('tecnici').select('*').order('cognome').order('nome');
        if (nomeFiltro && nomeFiltro.trim().length >= 3) {
            query = query.ilike('nome', `%${nomeFiltro}%`);
        }
        if (cognomeFiltro && cognomeFiltro.trim().length >= 3) {
            query = query.ilike('cognome', `%${cognomeFiltro}%`);
        }
        const { data, error: fetchError } = await query;
        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch tecnici:', fetchError);
            setTecnici([]);
        } else {
            setTecnici(data || []);
        }
        setPageLoading(false);
    };

    useEffect(() => {
        setTecnici([]);
        setPageLoading(false);
    }, [session?.user?.id, canManage]);

    useEffect(() => {
        if (!canManage) return;
        const fetchUsers = async () => {
            const { data, error: usersError } = await supabase
                .from('profiles')
                .select('id, username, full_name')
                .order('username');
            if (usersError) {
                console.error('Errore fetch profili:', usersError);
            }
            setUsers(data || []);
        };
        fetchUsers();
    }, [canManage]);

    useEffect(() => {
        if (!canManage) return;
    }, [canManage]);

    const resetForm = () => {
        setFormNome('');
        setFormCognome('');
        setFormEmail('');
        setFormUserId('');
        setFormMansioneId('');
        setFormRepartoId('');
        setFormAbilitatoPianificazione(true);
        setFilterUser('');
        setFilterMansione('');
        setFilterReparto('');
        setEditingTecnico(null);
    };
    
    const handleEditTecnico = (tecnico) => {
        if (!canManage) { alert("Non hai i permessi per modificare."); return; }
        setEditingTecnico(tecnico);
        setFormNome(tecnico.nome);
        setFormCognome(tecnico.cognome);
        setFormEmail(tecnico.email || '');
        setFormUserId(tecnico.user_id || '');
        setFormMansioneId(tecnico.mansione_id || '');
        setFormRepartoId(tecnico.reparto_id || '');
        setFormAbilitatoPianificazione(tecnico.abilitato_pianificazione !== false); // Default true se undefined
        setFilterUser('');
        setFilterMansione('');
        setFilterReparto('');
        window.scrollTo(0, 0);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) { alert("Non hai i permessi."); return; }
        if (!formNome.trim() || !formCognome.trim()) { alert("Nome e cognome obbligatori."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const tecnicoData = {
            nome: formNome.trim(),
            cognome: formCognome.trim(),
            email: formEmail.trim() || null,
            user_id: formUserId.trim() || null,
            mansione_id: formMansioneId.trim() || null,
            reparto_id: formRepartoId.trim() || null,
            abilitato_pianificazione: formAbilitatoPianificazione
        };
        let opError;
        if (editingTecnico) { 
            const { error } = await supabase.from('tecnici').update(tecnicoData).eq('id', editingTecnico.id); 
            opError = error; 
        } else { 
            const { error } = await supabase.from('tecnici').insert([tecnicoData]); 
            opError = error; 
        }
        if (opError) { 
            setError(opError.message); 
            alert((editingTecnico ? 'Modifica tecnico fallita: ' : 'Inserimento tecnico fallito: ') + opError.message); 
        } else {
            resetForm();
            await fetchTecnici(filtroNome.trim(), filtroCognome.trim());
            if (onDataChanged) onDataChanged();
            setSuccessMessage(editingTecnico ? 'Tecnico modificato con successo!' : 'Tecnico aggiunto con successo!');
            setTimeout(()=> setSuccessMessage(''), 3000);
        }
        setLoadingActions(false);
    };

    const handleDeleteTecnico = async (tecnicoId) => {
        if (!canManage) { alert("Non hai i permessi."); return; }
        if (window.confirm("Sei sicuro di voler eliminare questo tecnico?")) {
            setLoadingActions(true); setError(null); setSuccessMessage('');
            const { error: delError } = await supabase.from('tecnici').delete().eq('id', tecnicoId);
            if (delError) { 
                setError(delError.message); 
                alert("Eliminazione fallita: " + delError.message); 
            } else {
                await fetchTecnici(filtroNome.trim(), filtroCognome.trim());
                if (onDataChanged) onDataChanged();
                if (editingTecnico && editingTecnico.id === tecnicoId) resetForm();
                setSuccessMessage('Tecnico eliminato con successo!');
                setTimeout(()=> setSuccessMessage(''), 3000);
            }
            setLoadingActions(false);
        }
    };

    const handleExport = (format = 'csv') => {
        if (!tecnici || tecnici.length === 0) { alert("Nessun dato da esportare."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const headers = ["id", "nome", "cognome", "email", "created_at", "user_id"];
        const dataToExport = tecnici.map(t => ({ 
            id: t.id, nome: t.nome, cognome: t.cognome, email: t.email || '', 
            created_at: t.created_at, user_id: t.user_id || '' 
        }));
        try {
            if (format === 'xlsx') {
                const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
                const workbook = XLSX.utils.book_new(); 
                XLSX.utils.book_append_sheet(workbook, worksheet, "Tecnici");
                XLSX.writeFile(workbook, "esportazione_tecnici.xlsx");
                setSuccessMessage('Tecnici esportati in XLSX!');
            } else {
                const csvRows = [headers.join(',')];
                for (const row of dataToExport) { 
                    const values = headers.map(h => `"${(('' + (row[h] ?? '')).replace(/"/g, '""'))}"`); 
                    csvRows.push(values.join(',')); 
                }
                const csvString = csvRows.join('\n'); 
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a"); 
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); 
                link.setAttribute("download", "esportazione_tecnici.csv");
                document.body.appendChild(link); 
                link.click(); 
                document.body.removeChild(link);
                setSuccessMessage('Tecnici esportati in CSV!');
            }
            setTimeout(()=> setSuccessMessage(''), 3000);
        } catch (expError) { 
            setError("Esportazione fallita: " + expError.message); 
            console.error("Errore esportazione tecnici:", expError);
        }
        setLoadingActions(false);
    };
    
    const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, '_');

    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoadingActions(true); setError(null); setSuccessMessage(''); setImportProgress('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            let processedCount = 0; let successCount = 0; let errorCount = 0;
            const errorsDetail = []; let parsedData = [];
            try {
                const fileContent = e.target.result;
                if (file.name.endsWith('.csv')) { /* ... (Papa.parse con normalizeHeader) ... */ 
                    const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });
                    if (result.errors.length > 0) throw new Error("Errore CSV: " + result.errors.map(err => err.message).join(", "));
                    parsedData = result.data;
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) { /* ... (XLSX.read e normalizzazione chiavi) ... */
                    const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    parsedData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                    parsedData = parsedData.map(row => { const normRow = {}; for (const key in row) { normRow[normalizeHeader(key)] = row[key]; } return normRow; });
                } else { throw new Error("Formato file non supportato."); }

                if (parsedData.length === 0) { throw new Error("Il file è vuoto o non contiene dati validi."); }
                console.log("Dati letti e normalizzati (Tecnici):", parsedData);

                const datiDaUpsert = parsedData.map(row => {
                    const tecnico = {};
                    if (row.hasOwnProperty('nome')) tecnico.nome = String(row.nome || '').trim();
                    if (row.hasOwnProperty('cognome')) tecnico.cognome = String(row.cognome || '').trim();
                    if (row.hasOwnProperty('email')) tecnico.email = String(row.email || '').trim() || null;
                    return tecnico;
                }).filter(item => item.nome && item.cognome);

                if (datiDaUpsert.length === 0) { setError("Nessun dato valido (richiesti: nome, cognome)."); setLoadingActions(false); if(fileInputRef.current) fileInputRef.current.value = ""; return; }
                console.log("Dati pronti per upsert (Tecnici):", datiDaUpsert);

                const batchSize = 100;
                for (let i = 0; i < datiDaUpsert.length; i += batchSize) {
                    const batch = datiDaUpsert.slice(i, i + batchSize);
                    setImportProgress(`Processo ${i + batch.length} di ${datiDaUpsert.length}...`);
                    const { data, error: upsertError } = await supabase.from('tecnici')
                        .upsert(batch, { onConflict: 'nome,cognome' }) // Assicurati indice UNIQUE (LOWER(nome),LOWER(cognome))
                        .select();
                    if (upsertError) { errorsDetail.push(`Err batch tecnici: ${upsertError.message}`); errorCount += batch.length - (data ? data.length : 0); console.error("Err upsert tecnici:", upsertError); }
                    else { successCount += data ? data.length : 0; }
                }
                let finalMessage = `${successCount} tecnici importati/aggiornati.`;
                if (errorCount > 0) { finalMessage += ` ${errorCount} errori.`; setError(`Errori import. ${errorsDetail.slice(0,3).join('; ')}... Vedi console.`); console.error("Err import tecnici:", errorsDetail); }
                setSuccessMessage(finalMessage); setTimeout(()=> { setSuccessMessage(''); setError(null); }, 10000);
                await fetchTecnici(filtroNome.trim(), filtroCognome.trim());
                if (onDataChanged && successCount > 0) onDataChanged();
            } catch (parseOrProcessError) { setError("Errore critico import: " + parseOrProcessError.message); console.error("Err critico import tecnici:", parseOrProcessError); }
            finally { setLoadingActions(false); setImportProgress(''); if(fileInputRef.current) fileInputRef.current.value = ""; }
        };
        if (file.name.endsWith('.csv')) reader.readAsText(file); 
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) reader.readAsBinaryString(file);
        else { setError("Formato non supportato."); setLoadingActions(false); }
    };
    const triggerFileInput = () => fileInputRef.current?.click();

    const handleSearchTecnici = () => {
        setError(null);
        fetchTecnici(filtroNome.trim(), filtroCognome.trim());
    };

    const resetFiltri = () => {
        setFiltroNome('');
        setFiltroCognome('');
        setTecnici([]);
        setError(null);
        setRicercaSbloccata(false);
    };

    if (pageLoading) return <p>Caricamento anagrafica tecnici...</p>;
    if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    if (!session && !pageLoading) return <Navigate to="/login" replace />;

    return (
        <div>
            <h2>Anagrafica Tecnici Oilsafe</h2>
            {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap' }}>
                    <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelected} style={{ display: 'none' }} ref={fileInputRef} />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}> {loadingActions ? `Importando... ${importProgress}` : 'Importa/Aggiorna Tecnici'} </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || tecnici.length === 0}> Esporta CSV </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || tecnici.length === 0}> Esporta XLSX </button>
                    </div>
                </div>
            )}
            {importProgress && !loadingActions && <p>{importProgress}</p> }
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            <div className="filtri-container" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', background: '#f9f9f9' }}>
                <h4>Filtra Tecnici</h4>
                <div style={{display:'flex', gap:'10px', alignItems:'flex-end', flexWrap:'wrap'}}>
                    <div>
                        <label htmlFor="filtroNomeTecnico">Nome:</label>
                        <input type="text" id="filtroNomeTecnico" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} placeholder="Min 3 caratteri" />
                    </div>
                    <div>
                        <label htmlFor="filtroCognomeTecnico">Cognome:</label>
                        <input type="text" id="filtroCognomeTecnico" value={filtroCognome} onChange={e => setFiltroCognome(e.target.value)} placeholder="Min 3 caratteri" />
                    </div>
                    <button onClick={handleSearchTecnici} className="button secondary" disabled={loadingActions || pageLoading}>Cerca</button>
                    <button onClick={resetFiltri} className="button secondary" disabled={loadingActions || pageLoading}>Azzera</button>
                    {!ricercaSbloccata && (
                        <button onClick={() => setRicercaSbloccata(true)} className="button warning" disabled={loadingActions || pageLoading}>Sblocca Ricerca</button>
                    )}
                </div>
            </div>

            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingTecnico ? 'Modifica Tecnico' : 'Nuovo Tecnico'}</h3>
                    <div> <label htmlFor="formNomeTecnico">Nome:</label> <input type="text" id="formNomeTecnico" value={formNome} onChange={e => setFormNome(e.target.value)} required /> </div>
                    <div> <label htmlFor="formCognomeTecnico">Cognome:</label> <input type="text" id="formCognomeTecnico" value={formCognome} onChange={e => setFormCognome(e.target.value)} required /> </div>
                    <div>
                        <label htmlFor="formEmailTecnico">Email (Opzionale):</label>
                        <input type="email" id="formEmailTecnico" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="formUserIdTecnico">Profilo Utente:</label>
                        <input
                            type="text"
                            id="filterUserTecnico"
                            value={filterUser}
                            onChange={e => setFilterUser(e.target.value)}
                            placeholder="Filtra per username o nome..."
                            style={{marginBottom:'5px'}}
                        />
                        <select
                            id="formUserIdTecnico"
                            value={formUserId}
                            onChange={e => { setFormUserId(e.target.value); setFilterUser(''); }}
                        >
                            <option value="">Nessun profilo ({filteredUsers.length} trovati)</option>
                            {filteredUsers.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="formMansioneTecnico">Mansione/Qualifica:</label>
                        <input
                            type="text"
                            id="filterMansioneTecnico"
                            value={filterMansione}
                            onChange={e => setFilterMansione(e.target.value)}
                            placeholder="Filtra per ruolo o categoria..."
                            style={{marginBottom:'5px'}}
                        />
                        <select
                            id="formMansioneTecnico"
                            value={formMansioneId}
                            onChange={e => { setFormMansioneId(e.target.value); setFilterMansione(''); }}
                        >
                            <option value="">Nessuna mansione ({filteredMansioni.length} trovate)</option>
                            {filteredMansioni.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.ruolo} ({m.categoria} - {m.livello})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="formRepartoTecnico">Reparto:</label>
                        <input
                            type="text"
                            id="filterRepartoTecnico"
                            value={filterReparto}
                            onChange={e => setFilterReparto(e.target.value)}
                            placeholder="Filtra per codice o descrizione..."
                            style={{marginBottom:'5px'}}
                        />
                        <select
                            id="formRepartoTecnico"
                            value={formRepartoId}
                            onChange={e => { setFormRepartoId(e.target.value); setFilterReparto(''); }}
                        >
                            <option value="">Nessun reparto ({filteredReparti.length} trovati)</option>
                            {filteredReparti.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.codice} - {r.descrizione}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{marginTop: '15px', marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
                        <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px'}}>
                            <input
                                type="checkbox"
                                id="formAbilitatoPianificazione"
                                checked={formAbilitatoPianificazione}
                                onChange={e => setFormAbilitatoPianificazione(e.target.checked)}
                                style={{cursor: 'pointer'}}
                            />
                            <span style={{fontWeight: 'bold'}}>Visibile in Pianificazione</span>
                        </label>
                        <small style={{display: 'block', marginTop: '5px', marginLeft: '28px', color: '#666'}}>
                            Se disabilitato, il tecnico non apparirà nelle interfacce di pianificazione (griglia settimanale, calendario)
                        </small>
                    </div>
                    <button type="submit" disabled={loadingActions}>{loadingActions ? 'Salvataggio...' : (editingTecnico ? 'Salva Modifiche' : 'Aggiungi Tecnico')}</button>
                    {editingTecnico && ( <button type="button" className="secondary" onClick={resetForm} disabled={loadingActions} style={{marginLeft:'10px'}}> Annulla Modifica </button> )}
                </form>
            )}
            <h3>Elenco Tecnici</h3>
            {tecnici.length === 0 && !pageLoading ? ( <p>Nessun tecnico trovato.</p> ) : (
                <table className="data-table">
                    <thead><tr><th>Cognome</th><th>Nome</th><th>Email</th><th>Pianificazione</th>{canManage && <th>Azioni</th>}</tr></thead>
                    <tbody>
                        {tecnici.map(t => (
                            <tr key={t.id} style={editingTecnico && editingTecnico.id === t.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{t.cognome}</td>
                                <td>{t.nome}</td>
                                <td>{t.email || '-'}</td>
                                <td style={{textAlign: 'center'}}>
                                    <span
                                        title={t.abilitato_pianificazione !== false ? 'Visibile in pianificazione' : 'Non visibile in pianificazione'}
                                        style={{fontSize: '1.2em'}}
                                    >
                                        {t.abilitato_pianificazione !== false ? '📅' : '❌'}
                                    </span>
                                </td>
                                 {canManage && (<td className="actions">
                                        <button className="button secondary small" onClick={() => handleEditTecnico(t)} disabled={loadingActions}>Modifica</button>
                                        <button className="button danger small" onClick={() => handleDeleteTecnico(t.id)} disabled={loadingActions} style={{marginLeft:'5px'}}>Elimina</button>
                                    </td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default TecniciManager;