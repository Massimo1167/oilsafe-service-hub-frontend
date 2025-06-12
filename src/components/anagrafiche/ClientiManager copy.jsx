// src/components/Anagrafiche/ClientiManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient'; // Importa il client Supabase configurato
import Papa from 'papaparse'; // Libreria per parsare file CSV
import * as XLSX from 'xlsx'; // Libreria per leggere e scrivere file XLSX (Excel)
import { Navigate } from 'react-router-dom'; // Per reindirizzare se l'utente non è autorizzato

// Componente React per la gestione dell'anagrafica Clienti
function ClientiManager({ session }) { // Riceve la sessione utente come prop
    // --- STATI DEL COMPONENTE ---
    const [clienti, setClienti] = useState([]); // Array per memorizzare la lista dei clienti letta dal DB
    const [loadingActions, setLoadingActions] = useState(false); // Stato di caricamento per operazioni come aggiunta, modifica, eliminazione, import/export
    const [pageLoading, setPageLoading] = useState(true); // Stato di caricamento per il fetch iniziale della lista clienti
    const [error, setError] = useState(null); // Stato per memorizzare messaggi di errore
    const [successMessage, setSuccessMessage] = useState(''); // Stato per messaggi di successo temporanei
    const [importProgress, setImportProgress] = useState(''); // Stato per mostrare il progresso dell'importazione

    // Stati per i campi del form di aggiunta/modifica cliente
    const [formNomeAzienda, setFormNomeAzienda] = useState('');
    const [formIndirizzoDefault, setFormIndirizzoDefault] = useState(''); // Campo per l'indirizzo principale/default del cliente
    
    // Stato per memorizzare il cliente attualmente in modifica (null se siamo in modalità aggiunta)
    const [editingCliente, setEditingCliente] = useState(null); 

    // Determina il ruolo dell'utente e se ha i permessi per gestire l'anagrafica
    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';

    // Ref per l'elemento input di tipo file (usato per l'importazione)
    const fileInputRef = useRef(null);

    // --- FUNZIONI ---

    // Funzione asincrona per caricare i clienti dal database Supabase
    const fetchClienti = async () => {
        setPageLoading(true); // Imposta il caricamento della pagina
        setError(null); // Resetta eventuali errori precedenti
        
        // Query a Supabase per selezionare tutti i clienti e il loro indirizzo di default (se esiste)
        // La tabella 'indirizzi_clienti' è joinata per prendere l'indirizzo marcato come 'is_default = true'
        // Se un cliente ha più indirizzi default (non dovrebbe), ne prenderà uno.
        // Se non ha indirizzi default, indirizzi_clienti sarà un array vuoto per quel cliente.
        const { data, error: fetchError } = await supabase
            .from('clienti')
            .select(`
                id,
                nome_azienda,
                created_at,
                indirizzi_clienti (id, indirizzo_completo, is_default)
            `)
            .order('nome_azienda'); // Ordina i clienti per nome azienda

        if (fetchError) { 
            setError(fetchError.message); 
            console.error('Errore fetch clienti con indirizzi:', fetchError); 
        } else { 
            // Mappa i dati ricevuti per estrarre l'indirizzo di default in modo più semplice
            // e aggiungerlo come proprietà diretta all'oggetto cliente per facilitare la visualizzazione/modifica.
            const clientiConDefaultAddr = data.map(cliente => {
                // Trova il primo indirizzo marcato come default per questo cliente
                const defaultAddress = cliente.indirizzi_clienti.find(addr => addr.is_default);
                return {
                    ...cliente, // Mantiene tutti i campi originali del cliente
                    indirizzo_default_completo: defaultAddress?.indirizzo_completo || '', // Indirizzo testuale
                    indirizzo_default_id: defaultAddress?.id // ID dell'indirizzo default, utile per l'update
                };
            });
            setClienti(clientiConDefaultAddr || []); // Aggiorna lo stato con i clienti (o array vuoto se data è null)
        }
        setPageLoading(false); // Termina il caricamento della pagina
    };

    // useEffect per caricare i clienti al mount del componente o quando la sessione/permessi cambiano
    useEffect(() => {
        if (session && canManage) { // Solo se l'utente è loggato e ha i permessi
            fetchClienti(); 
        } else { 
            setClienti([]); // Svuota i clienti se non ci sono permessi o sessione
            setPageLoading(false); 
        }
    }, [session, canManage]); // Dipendenze dell'effetto

    // Funzione per resettare i campi del form e lo stato di modifica
    const resetForm = () => { 
        setFormNomeAzienda(''); 
        setFormIndirizzoDefault(''); 
        setEditingCliente(null); // Esce dalla modalità modifica
    };
    
    // Funzione per preparare il form alla modifica di un cliente esistente
    const handleEditCliente = (cliente) => {
        if (!canManage) { alert("Non hai i permessi per modificare."); return; }
        setEditingCliente(cliente); // Imposta il cliente in modifica
        setFormNomeAzienda(cliente.nome_azienda); // Popola il form con i dati del cliente
        setFormIndirizzoDefault(cliente.indirizzo_default_completo || ''); // Popola l'indirizzo di default
        window.scrollTo(0, 0); // Scrolla la pagina in cima per rendere visibile il form
    };

    // Funzione per gestire il submit del form (sia per aggiunta che per modifica)
    const handleSubmitForm = async (e) => {
        e.preventDefault(); // Previene il comportamento di default del form (ricaricamento pagina)
        if (!canManage) { alert("Non hai i permessi per questa operazione."); return; }
        if (!formNomeAzienda.trim()) { alert("Il nome azienda è obbligatorio."); return; }
        
        setLoadingActions(true); setError(null); setSuccessMessage('');
        
        try {
            let clienteId; // ID del cliente (nuovo o esistente)
            let indirizzoDefaultIdDaDb = editingCliente?.indirizzo_default_id || null; // ID dell'indirizzo default esistente (se c'è)

            // Dati base del cliente (solo nome_azienda, l'indirizzo è gestito separatamente)
            const clientePayload = { nome_azienda: formNomeAzienda.trim() };

            if (editingCliente) { // Se siamo in modalità MODIFICA cliente
                const { data: updatedCliente, error: clienteError } = await supabase
                    .from('clienti')
                    .update(clientePayload)
                    .eq('id', editingCliente.id)
                    .select('id') // Richiedi l'ID indietro per conferma
                    .single(); // Aspettiamo un singolo risultato
                if (clienteError) throw clienteError; // Lancia l'errore per il blocco catch
                clienteId = updatedCliente.id;
            } else { // Se siamo in modalità AGGIUNTA cliente
                const { data: newCliente, error: clienteError } = await supabase
                    .from('clienti')
                    .insert(clientePayload)
                    .select('id')
                    .single();
                if (clienteError) throw clienteError;
                clienteId = newCliente.id;
                indirizzoDefaultIdDaDb = null; // Per un nuovo cliente, non c'è un indirizzo default precedente
            }

            // Ora gestiamo l'indirizzo di default nella tabella 'indirizzi_clienti'
            const indirizzoDefaultTrimmed = formIndirizzoDefault.trim();
            if (indirizzoDefaultTrimmed) { // Se è stato fornito un indirizzo di default nel form
                const indirizzoData = {
                    cliente_id: clienteId,
                    indirizzo_completo: indirizzoDefaultTrimmed,
                    is_default: true,
                    descrizione: 'Sede Principale' // Descrizione di default
                };

                if (indirizzoDefaultIdDaDb) { // Se c'era già un indirizzo default, lo aggiorniamo
                    console.log("Aggiorno indirizzo default esistente ID:", indirizzoDefaultIdDaDb);
                    const { error: addrErr } = await supabase.from('indirizzi_clienti').update(indirizzoData).eq('id', indirizzoDefaultIdDaDb);
                    if (addrErr) console.warn("Attenzione: errore aggiornamento indirizzo default esistente:", addrErr.message);
                } else { // Altrimenti, è un nuovo indirizzo default (o il primo)
                    // Prima, assicurati che non ci siano altri indirizzi default per questo cliente (logica applicativa)
                    console.log("Imposto altri indirizzi default per cliente", clienteId, "a false");
                    await supabase.from('indirizzi_clienti').update({ is_default: false }).eq('cliente_id', clienteId).eq('is_default', true);
                    
                    console.log("Inserisco nuovo indirizzo default per cliente ID:", clienteId);
                    const { error: addrErr } = await supabase.from('indirizzi_clienti').insert(indirizzoData);
                    if (addrErr) console.warn("Attenzione: errore inserimento nuovo indirizzo default:", addrErr.message);
                }
            } else if (indirizzoDefaultIdDaDb) {
                // Se l'indirizzo di default è stato cancellato dal form, potremmo volerlo eliminare dalla tabella indirizzi_clienti
                // o semplicemente marcarlo come non di default. Per ora, lo eliminiamo.
                console.log("L'indirizzo di default è stato svuotato. Cancello l'indirizzo ID:", indirizzoDefaultIdDaDb);
                await supabase.from('indirizzi_clienti').delete().eq('id', indirizzoDefaultIdDaDb);
            }
            
            resetForm(); 
            await fetchClienti(); // Ricarica la lista per mostrare le modifiche
            setSuccessMessage(editingCliente ? 'Cliente e indirizzo principale modificati!' : 'Cliente e indirizzo principale aggiunti!'); 
            setTimeout(()=> setSuccessMessage(''), 3000);

        } catch (opError) {
            setError(opError.message); 
            alert((editingCliente ? 'Modifica cliente/indirizzo fallita: ' : 'Inserimento cliente/indirizzo fallito: ') + opError.message); 
            console.error("Errore handleSubmitForm Cliente:", opError);
        } finally {
            setLoadingActions(false);
        }
    };

    // Funzione per eliminare un cliente (e i suoi indirizzi tramite CASCADE)
    const handleDeleteCliente = async (clienteId) => {
        if (!canManage) { alert("Non hai i permessi per eliminare."); return; }
        if (window.confirm("Sei sicuro di voler eliminare questo cliente? Questa azione eliminerà anche tutti i suoi indirizzi e potrebbe influire sui fogli di assistenza e ordini associati.")) {
            setLoadingActions(true); setError(null); setSuccessMessage('');
            const { error: deleteError } = await supabase.from('clienti').delete().eq('id', clienteId);
            if (deleteError) { 
                setError(deleteError.message); 
                alert("Eliminazione fallita: " + deleteError.message); 
            } else { 
                await fetchClienti(); 
                if (editingCliente && editingCliente.id === clienteId) {
                    resetForm(); 
                }
                setSuccessMessage('Cliente eliminato con successo!'); 
                setTimeout(()=> setSuccessMessage(''), 3000);
            }
            setLoadingActions(false);
        }
    };

    // Funzione per esportare i dati in CSV o XLSX
    const handleExport = (format = 'csv') => {
        if (!clienti || clienti.length === 0) { alert("Nessun cliente da esportare."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');

        // Esportiamo l'ID del cliente, il nome e l'indirizzo di default mappato
        const headers = ["id_cliente", "nome_azienda", "indirizzo_default", "created_at_cliente"]; 
        const dataToExport = clienti.map(c => ({
            id_cliente: c.id,
            nome_azienda: c.nome_azienda,
            indirizzo_default: c.indirizzo_default_completo || '', // Usa il campo mappato da fetchClienti
            created_at_cliente: c.created_at
        }));

        try {
            if (format === 'xlsx') {
                const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Clienti");
                XLSX.writeFile(workbook, "esportazione_clienti.xlsx");
                setSuccessMessage('Clienti esportati in XLSX!');
            } else { 
                const csvRows = [headers.join(',')];
                for (const row of dataToExport) { 
                    const values = headers.map(header => {
                        // Gestisce valori null/undefined e fa l'escape delle virgolette doppie
                        const val = row[header] === null || typeof row[header] === 'undefined' ? '' : row[header];
                        return `"${String(val).replace(/"/g, '""')}"`;
                    });
                    csvRows.push(values.join(','));
                }
                const csvString = csvRows.join('\n');
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "esportazione_clienti.csv");
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                setSuccessMessage('Clienti esportati in CSV!');
            }
            setTimeout(()=> setSuccessMessage(''), 3000);
        } catch (expError) {
            setError("Esportazione fallita: " + expError.message);
            console.error("Errore durante l'esportazione:", expError);
        }
        setLoadingActions(false);
    };
    
    // Funzione per normalizzare gli header letti da file CSV/XLSX
    const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, '_');

    // Funzione per gestire la selezione e il parsing del file per l'importazione
    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoadingActions(true); setError(null); setSuccessMessage(''); setImportProgress('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            let processedCount = 0;
            let successCount = 0;
            let errorCount = 0;
            const errorsDetail = [];
            let parsedData = [];

            try {
                const fileContent = e.target.result; 
                if (file.name.endsWith('.csv')) {
                    const result = Papa.parse(fileContent, { 
                        header: true, // La prima riga è l'header
                        skipEmptyLines: true,
                        transformHeader: header => normalizeHeader(header) // Normalizza gli header
                    });
                    if (result.errors.length > 0) {
                        throw new Error("Errore parsing CSV: " + result.errors.map(err => err.message).join(", "));
                    }
                    parsedData = result.data;
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0]; // Prende il primo foglio
                    const worksheet = workbook.Sheets[sheetName];
                    // Converte il foglio in JSON, xlsx gestisce la prima riga come header
                    parsedData = XLSX.utils.sheet_to_json(worksheet, { 
                        raw: false, // Ottieni valori formattati
                        dateNF: 'yyyy-mm-dd' // Formato per le date
                    });
                    // Normalizza le chiavi degli oggetti dopo la conversione da XLSX
                    parsedData = parsedData.map(row => {
                        const normalizedRow = {};
                        for (const key in row) {
                            normalizedRow[normalizeHeader(key)] = row[key];
                        }
                        return normalizedRow;
                    });
                } else { 
                    throw new Error("Formato file non supportato. Usare .csv o .xlsx"); 
                }
                
                if (parsedData.length === 0) { throw new Error("Il file è vuoto o non è stato possibile leggerne i dati."); }
                console.log("Dati letti e normalizzati dal file (Clienti):", parsedData);

                const clientiDaUpsert = []; // Array per i dati pronti per l'upsert del cliente
                const indirizziDaGestire = []; // Array per gli indirizzi associati

                for (const row of parsedData) {
                    const nomeAzienda = String(row.nome_azienda || '').trim();
                    // Cerca 'indirizzo_default' o 'indirizzo' per flessibilità
                    const indirizzoDefaultCompleto = String(row.indirizzo_default || row.indirizzo || '').trim();

                    if (!nomeAzienda) {
                        errorsDetail.push(`Riga saltata: nome_azienda mancante.`); 
                        errorCount++; 
                        continue; // Salta questa riga se manca il nome_azienda
                    }
                    
                    // Prepara i dati per l'upsert del cliente
                    clientiDaUpsert.push({ nome_azienda: nomeAzienda });
                    // Associa l'indirizzo al nome_azienda per gestirlo dopo l'upsert del cliente
                    if (indirizzoDefaultCompleto) {
                        indirizziDaGestire.push({ nome_azienda_ref: nomeAzienda, indirizzo_completo: indirizzoDefaultCompleto, is_default: true, descrizione: 'Sede Principale (da import)' });
                    }
                }

                if (clientiDaUpsert.length === 0) {
                    setError("Nessun dato valido da importare (richiesto almeno 'nome_azienda' negli header del file)."); 
                    setLoadingActions(false); 
                    if(fileInputRef.current) fileInputRef.current.value = ""; 
                    return;
                }

                console.log("Clienti pronti per upsert:", clientiDaUpsert);
                // 1. Upsert dei Clienti
                const { data: upsertedClientiData, error: upsertClienteError } = await supabase
                    .from('clienti')
                    .upsert(clientiDaUpsert, { onConflict: 'nome_azienda' })
                    .select('id, nome_azienda');

                if (upsertClienteError) {
                    // Se l'upsert dei clienti fallisce in toto, segnala e interrompi
                    throw new Error("Errore durante l'upsert dei clienti: " + upsertClienteError.message);
                }
                
                successCount = upsertedClientiData ? upsertedClientiData.length : 0;

                // 2. Gestione degli Indirizzi per i clienti inseriti/aggiornati
                if (upsertedClientiData && upsertedClientiData.length > 0 && indirizziDaGestire.length > 0) {
                    setImportProgress('Aggiornamento indirizzi...');
                    for (const clienteUpsertato of upsertedClientiData) {
                        const indirizzoCorrispondente = indirizziDaGestire.find(i => i.nome_azienda_ref === clienteUpsertato.nome_azienda);
                        if (indirizzoCorrispondente) {
                            // Rimuovi eventuali altri default per questo cliente
                            await supabase.from('indirizzi_clienti').update({ is_default: false }).eq('cliente_id', clienteUpsertato.id).eq('is_default', true);
                            // Upsert del nuovo indirizzo default
                            // Per l'upsert dell'indirizzo, potremmo aver bisogno di un constraint UNIQUE su (cliente_id, is_default) WHERE is_default=true
                            // o su (cliente_id, indirizzo_completo). 
                            // Semplifichiamo: cerchiamo un default, se c'è lo aggiorniamo, altrimenti inseriamo.
                            const { data: existingDefault, error: findErr } = await supabase.from('indirizzi_clienti')
                                .select('id').eq('cliente_id', clienteUpsertato.id).eq('is_default', true).maybeSingle();
                            
                            if(findErr && findErr.code !== 'PGRST116') console.error("Errore ricerca default addr:", findErr);

                            if(existingDefault) {
                                await supabase.from('indirizzi_clienti').update({
                                    indirizzo_completo: indirizzoCorrispondente.indirizzo_completo,
                                    descrizione: indirizzoCorrispondente.descrizione
                                }).eq('id', existingDefault.id);
                            } else {
                                await supabase.from('indirizzi_clienti').insert({
                                    cliente_id: clienteUpsertato.id,
                                    indirizzo_completo: indirizzoCorrispondente.indirizzo_completo,
                                    is_default: true,
                                    descrizione: indirizzoCorrispondente.descrizione
                                });
                            }
                        }
                    }
                }
                
                let finalMessage = `${successCount} clienti importati/aggiornati.`;
                if (errorCount > 0) { // errorCount qui si riferirebbe a errori di pre-validazione
                    finalMessage += ` ${errorCount} righe inizialmente scartate.`;
                }
                if (errorsDetail.length > errorCount) { // Se ci sono stati errori durante l'upsert non contati prima
                    finalMessage += ` Alcuni errori durante l'upsert.`;
                     setError(`Errori durante l'importazione. ${errorsDetail.slice(0,3).join('; ')}... Vedi console per tutti i dettagli.`);
                }
                setSuccessMessage(finalMessage);
                setTimeout(()=> { setSuccessMessage(''); setError(null); }, 10000);
                await fetchClienti();

            } catch (parseOrProcessError) { 
                setError("Errore critico durante l'importazione: " + parseOrProcessError.message); 
                console.error("Errore critico importazione clienti:", parseOrProcessError);
            } finally { 
                setLoadingActions(false); 
                setImportProgress('');
                if(fileInputRef.current) fileInputRef.current.value = ""; 
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsBinaryString(file); 
        } else {
            setError("Formato file non supportato.");
            setLoadingActions(false);
        }
    };
    
    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    if (pageLoading) return <p>Caricamento anagrafica clienti...</p>;
    if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    // Modificato il controllo per Navigate: assicurati che !session sia vero E che pageLoading sia false
    // per evitare reindirizzamenti prematuri durante il caricamento iniziale della sessione in App.jsx
    if (!session && !pageLoading) return <Navigate to="/login" replace />;


    return (
        <div>
            <h2>Anagrafica Clienti</h2>
            {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap' }}>
                    <input 
                        type="file" 
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                        onChange={handleFileSelected} 
                        style={{ display: 'none' }} 
                        ref={fileInputRef} 
                    />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}>
                        {loadingActions ? `Importando... ${importProgress}` : 'Importa/Aggiorna Clienti'}
                    </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || clienti.length === 0}> 
                            Esporta CSV 
                        </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || clienti.length === 0}> 
                            Esporta XLSX 
                        </button>
                    </div>
                </div>
            )}
            
            {importProgress && !loadingActions && <p>{importProgress}</p> }
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingCliente ? 'Modifica Cliente' : 'Nuovo Cliente'}</h3>
                    <div> 
                        <label htmlFor="formNomeAzienda">Nome Azienda:</label> 
                        <input type="text" id="formNomeAzienda" value={formNomeAzienda} onChange={e => setFormNomeAzienda(e.target.value)} required /> 
                    </div>
                    <div> 
                        <label htmlFor="formIndirizzoDefault">Indirizzo Sede Principale:</label> 
                        <input type="text" id="formIndirizzoDefault" value={formIndirizzoDefault} onChange={e => setFormIndirizzoDefault(e.target.value)} /> 
                    </div>
                    <button type="submit" disabled={loadingActions}>{loadingActions ? 'Salvataggio...' : (editingCliente ? 'Salva Modifiche' : 'Aggiungi Cliente')}</button>
                    {editingCliente && ( <button type="button" className="secondary" onClick={resetForm} disabled={loadingActions} style={{marginLeft:'10px'}}> Annulla Modifica </button> )}
                </form>
            )}

            <h3>Elenco Clienti</h3>
            {clienti.length === 0 && !pageLoading ? ( <p>Nessun cliente trovato.</p> ) : (
                 <table>
                    <thead>
                        <tr>
                            <th>Nome Azienda</th>
                            <th>Indirizzo Sede Principale</th> 
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {clienti.map(cliente => (
                            <tr key={cliente.id} style={editingCliente && editingCliente.id === cliente.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{cliente.nome_azienda}</td>
                                <td>{cliente.indirizzo_default_completo || '-'}</td> 
                                {canManage && (
                                   <td className="actions">
                                       <button className="button secondary small" onClick={() => handleEditCliente(cliente)} disabled={loadingActions}>Modifica</button>
                                       <button className="button danger small" onClick={() => handleDeleteCliente(cliente.id)} disabled={loadingActions} style={{marginLeft:'5px'}}>Elimina</button>
                                   </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default ClientiManager;