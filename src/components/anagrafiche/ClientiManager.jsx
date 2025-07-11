/**
 * CRUD management interface for clients ("clienti").
 * Uses Supabase for data persistence and supports CSV/XLSX import-export.
 * Relies on authentication from `App.jsx`; redirects if the user lacks
 * permissions. Displays and manages client addresses as well.
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

const RIGHE_PER_PAGINA_CLIENTI = 15;

function ClientiManager({ session }) {
    const [clienti, setClienti] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false); 
    const [pageLoading, setPageLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [importProgress, setImportProgress] = useState('');
    const [filtroNomeAzienda, setFiltroNomeAzienda] = useState('');
    const [ricercaSbloccata, setRicercaSbloccata] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);

    const [exportScope, setExportScope] = useState('page');

    const [formNuovoNomeAzienda, setFormNuovoNomeAzienda] = useState('');
    const [selectedCliente, setSelectedCliente] = useState(null); 
    const [formEditNomeAzienda, setFormEditNomeAzienda] = useState('');
    
    const [indirizziClienteCorrente, setIndirizziClienteCorrente] = useState([]);
    const [loadingIndirizzi, setLoadingIndirizzi] = useState(false);
    const [formNuovoIndirizzoCompleto, setFormNuovoIndirizzoCompleto] = useState('');
    const [formNuovaDescrizioneIndirizzo, setFormNuovaDescrizioneIndirizzo] = useState('');
    
    const [editingIndirizzo, setEditingIndirizzo] = useState(null); 
    const [formEditIndirizzoCompleto, setFormEditIndirizzoCompleto] = useState('');
    const [formEditIndirizzoDescrizione, setFormEditIndirizzoDescrizione] = useState('');

    const userRole = (session?.user?.role || '').trim().toLowerCase();
    const canManage = userRole === 'admin' || userRole === 'manager';
    const fileInputRef = useRef(null);

    // --- FUNZIONI CRUD E FETCH (come l'ultima versione completa e corretta) ---
    const fetchClienti = async (nomeFiltro) => {
        if (!ricercaSbloccata && (!nomeFiltro || nomeFiltro.trim().length < 3)) {
            setClienti([]);
            setError('Inserire almeno 3 caratteri o sbloccare la ricerca.');
            setPageLoading(false);
            return;
        }
        setPageLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('clienti')
            .select(
                `id, nome_azienda, created_at, indirizzi_clienti (id, indirizzo_completo, is_default, descrizione)`
            )
            .ilike('nome_azienda', `%${nomeFiltro}%`)
            .order('nome_azienda');
        if (fetchError) { setError(fetchError.message); console.error('Errore fetch clienti:', fetchError); } 
        else { 
            const clientiMappati = (data || []).map(c => {
                const defaultAddr = c.indirizzi_clienti.find(addr => addr.is_default);
                return { ...c, indirizzo_default_visualizzato: defaultAddr?.indirizzo_completo || (c.indirizzi_clienti.length > 0 ? c.indirizzi_clienti[0].indirizzo_completo : '') };
            });
            setClienti(clientiMappati);
            setCurrentPage(1);
        }
        setPageLoading(false);
    };
    useEffect(() => {
        setClienti([]);
        setPageLoading(false);
    }, [session, canManage]);
    useEffect(() => {
        const fetchIndirizzi = async () => {
            if (selectedCliente?.id) {
                setLoadingIndirizzi(true);
                const { data, error: err } = await supabase.from('indirizzi_clienti').select('*').eq('cliente_id', selectedCliente.id).order('is_default', {ascending:false}).order('descrizione');
                if(err) setError("Errore indirizzi: "+err.message); else setIndirizziClienteCorrente(data||[]);
                setLoadingIndirizzi(false);
            } else setIndirizziClienteCorrente([]);
        };
        fetchIndirizzi();
    }, [selectedCliente]);
    const resetFormNuovoCliente = () => setFormNuovoNomeAzienda('');
    const resetFormIndirizzi = () => { setFormNuovoIndirizzoCompleto(''); setFormNuovaDescrizioneIndirizzo(''); setEditingIndirizzo(null); setFormEditIndirizzoCompleto(''); setFormEditIndirizzoDescrizione(''); };
    const handleSelectClienteForManagement = (cliente) => {
        if (!canManage) return;
        if (selectedCliente?.id === cliente.id) { setSelectedCliente(null); setFormEditNomeAzienda(''); resetFormIndirizzi(); }
        else { setSelectedCliente(cliente); setFormEditNomeAzienda(cliente.nome_azienda); resetFormIndirizzi(); }
    };
    const reloadIndirizziCliente = async (clienteId) => {
        setLoadingIndirizzi(true);
        const { data, error: err } = await supabase
            .from('indirizzi_clienti')
            .select('*')
            .eq('cliente_id', clienteId)
            .order('is_default', { ascending: false })
            .order('descrizione');
        if (err) {
            setError('Errore indirizzi: ' + err.message);
            setIndirizziClienteCorrente([]);
        } else {
            setIndirizziClienteCorrente(data || []);
        }
        setLoadingIndirizzi(false);
    };

    const handleAddNuovoCliente = async (e) => {
        e.preventDefault();
        if (!canManage) { alert('Non hai i permessi.'); return; }
        if (!formNuovoNomeAzienda.trim()) { alert('Nome azienda obbligatorio.'); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const { error } = await supabase
            .from('clienti')
            .insert([{ nome_azienda: formNuovoNomeAzienda.trim() }]);
        if (error) {
            setError(error.message);
            alert('Inserimento cliente fallito: ' + error.message);
        } else {
            resetFormNuovoCliente();
            await fetchClienti(filtroNomeAzienda.trim());
            setSuccessMessage('Cliente aggiunto con successo!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        setLoadingActions(false);
    };

    const handleUpdateNomeClienteSelezionato = async (e) => {
        e.preventDefault();
        if (!canManage || !selectedCliente) return;
        if (!formEditNomeAzienda.trim()) { alert('Nome azienda obbligatorio.'); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const { error } = await supabase
            .from('clienti')
            .update({ nome_azienda: formEditNomeAzienda.trim() })
            .eq('id', selectedCliente.id);
        if (error) {
            setError(error.message);
            alert('Modifica fallita: ' + error.message);
        } else {
            await fetchClienti(filtroNomeAzienda.trim());
            setSelectedCliente(prev => prev ? { ...prev, nome_azienda: formEditNomeAzienda.trim() } : null);
            setSuccessMessage('Nome cliente aggiornato!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        setLoadingActions(false);
    };

    const handleAddIndirizzoCliente = async () => {
        if (!canManage || !selectedCliente) return;
        if (!formNuovoIndirizzoCompleto.trim()) { alert('Indirizzo obbligatorio.'); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const nuovoIndirizzo = {
            cliente_id: selectedCliente.id,
            indirizzo_completo: formNuovoIndirizzoCompleto.trim(),
            descrizione: formNuovaDescrizioneIndirizzo.trim() || null,
            is_default: indirizziClienteCorrente.length === 0,
        };
        const { error } = await supabase.from('indirizzi_clienti').insert([nuovoIndirizzo]);
        if (error) {
            setError(error.message);
            alert('Inserimento indirizzo fallito: ' + error.message);
        } else {
            resetFormIndirizzi();
            await reloadIndirizziCliente(selectedCliente.id);
            await fetchClienti(filtroNomeAzienda.trim());
            setSuccessMessage('Indirizzo aggiunto con successo!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        setLoadingActions(false);
    };

    const handleDeleteIndirizzoCliente = async (indirizzoId) => {
        if (!canManage || !selectedCliente) return;
        if (!window.confirm('Eliminare questo indirizzo?')) return;
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const { error } = await supabase.from('indirizzi_clienti').delete().eq('id', indirizzoId);
        if (error) {
            setError(error.message);
            alert('Eliminazione indirizzo fallita: ' + error.message);
        } else {
            if (editingIndirizzo && editingIndirizzo.id === indirizzoId) handleCancelEditIndirizzo();
            await reloadIndirizziCliente(selectedCliente.id);
            await fetchClienti(filtroNomeAzienda.trim());
            setSuccessMessage('Indirizzo eliminato con successo!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        setLoadingActions(false);
    };

    const handleSetDefaultIndirizzoCliente = async (idDefault) => {
        if (!canManage || !selectedCliente) return;
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const clienteId = selectedCliente.id;
        const { error: unsetErr } = await supabase
            .from('indirizzi_clienti')
            .update({ is_default: false })
            .eq('cliente_id', clienteId)
            .eq('is_default', true);
        const { error: setErr } = await supabase
            .from('indirizzi_clienti')
            .update({ is_default: true })
            .eq('id', idDefault);
        const combinedError = unsetErr || setErr;
        if (combinedError) {
            setError(combinedError.message);
            alert('Impostazione default fallita: ' + combinedError.message);
        } else {
            await reloadIndirizziCliente(clienteId);
            await fetchClienti(filtroNomeAzienda.trim());
            setSuccessMessage('Indirizzo impostato come predefinito!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        setLoadingActions(false);
    };

    const handleStartEditIndirizzo = (indirizzo) => {
        if (!canManage) return;
        setEditingIndirizzo(indirizzo);
        setFormEditIndirizzoCompleto(indirizzo.indirizzo_completo);
        setFormEditIndirizzoDescrizione(indirizzo.descrizione || '');
    };

    const handleCancelEditIndirizzo = () => {
        setEditingIndirizzo(null);
        setFormEditIndirizzoCompleto('');
        setFormEditIndirizzoDescrizione('');
    };

    const handleSaveEditIndirizzo = async () => {
        if (!canManage || !editingIndirizzo) return;
        if (!formEditIndirizzoCompleto.trim()) { alert('Indirizzo obbligatorio.'); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const { error } = await supabase
            .from('indirizzi_clienti')
            .update({
                indirizzo_completo: formEditIndirizzoCompleto.trim(),
                descrizione: formEditIndirizzoDescrizione.trim() || null,
            })
            .eq('id', editingIndirizzo.id);
        if (error) {
            setError(error.message);
            alert('Modifica indirizzo fallita: ' + error.message);
        } else {
            handleCancelEditIndirizzo();
            await reloadIndirizziCliente(selectedCliente.id);
            await fetchClienti(filtroNomeAzienda.trim());
            setSuccessMessage('Indirizzo modificato con successo!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        setLoadingActions(false);
    };

    const handleDeleteCliente = async (clienteId) => {
        if (!canManage) return;
        if (!window.confirm('Eliminare questo cliente?')) return;
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const { error } = await supabase.from('clienti').delete().eq('id', clienteId);
        if (error) {
            setError(error.message);
            alert('Eliminazione cliente fallita: ' + error.message);
        } else {
            if (selectedCliente && selectedCliente.id === clienteId) {
                setSelectedCliente(null);
                resetFormIndirizzi();
            }
            await fetchClienti(filtroNomeAzienda.trim());
            setSuccessMessage('Cliente eliminato con successo!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        setLoadingActions(false);
    };

    const handleExport = async (format = 'csv', scope = exportScope) => {
        const dataSource = scope === 'page' ? displayedClienti : clienti;
        let clientiToUse = dataSource;

        if (scope === 'all') {
            const { data, error: fetchError } = await supabase
                .from('clienti')
                .select(`id, nome_azienda, indirizzi_clienti (id, indirizzo_completo, descrizione, is_default)`) 
                .order('nome_azienda');
            if (fetchError) { setError(fetchError.message); return; }
            clientiToUse = data || [];
        }

        if (!clientiToUse || clientiToUse.length === 0) { alert('Nessun dato da esportare.'); return; }

        setLoadingActions(true); setError(null); setSuccessMessage('');
        const headers = ['cliente_id', 'nome_azienda', 'indirizzo_completo', 'descrizione', 'is_default'];
        const rows = [];
        clientiToUse.forEach(c => {
            const addresses = c.indirizzi_clienti && c.indirizzi_clienti.length > 0 ? c.indirizzi_clienti : [{ indirizzo_completo: '', descrizione: '', is_default: false }];
            addresses.forEach(addr => {
                rows.push({
                    cliente_id: c.id,
                    nome_azienda: c.nome_azienda,
                    indirizzo_completo: addr.indirizzo_completo || '',
                    descrizione: addr.descrizione || '',
                    is_default: addr.is_default ? 'Sì' : ''
                });
            });
        });

        try {
            if (format === 'xlsx') {
                const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Clienti');
                XLSX.writeFile(workbook, 'esportazione_clienti.xlsx');
                setSuccessMessage('Clienti esportati in XLSX!');
            } else {
                const csvRows = [headers.join(',')];
                for (const row of rows) {
                    const values = headers.map(h => `"${(('' + (row[h] ?? '')).replace(/"/g, '""'))}"`);
                    csvRows.push(values.join(','));
                }
                const csvString = csvRows.join('\n');
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'esportazione_clienti.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                setSuccessMessage('Clienti esportati in CSV!');
            }
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (expError) {
            setError('Esportazione fallita: ' + expError.message);
            console.error('Errore esportazione clienti:', expError);
        }
        setLoadingActions(false);
    };

    const handleExportUtilizzoClienti = async () => {
        setLoadingActions(true); setError(null); setSuccessMessage('');
        try {
            const { data: clientiData, error: clientiErr } = await supabase
                .from('clienti')
                .select('id, nome_azienda, indirizzi_clienti (indirizzo_completo, is_default)');
            if (clientiErr) throw clientiErr;

            const { data: fogliData, error: fogliErr } = await supabase
                .from('fogli_assistenza')
                .select('id, cliente_id, numero_foglio');
            if (fogliErr) throw fogliErr;
            const { data: ordiniData, error: ordiniErr } = await supabase
                .from('ordini_cliente')
                .select('id, cliente_id, numero_ordine_cliente');
            if (ordiniErr) throw ordiniErr;
            const { data: commesseData, error: commesseErr } = await supabase
                .from('commesse')
                .select('id, cliente_id, codice_commessa');
            if (commesseErr) throw commesseErr;

            const clientiMap = new Map(
                (clientiData || []).map(c => {
                    const defaultAddr = (c.indirizzi_clienti || []).find(a => a.is_default) || (c.indirizzi_clienti || [])[0];
                    return [c.id, {
                        nome: c.nome_azienda,
                        indirizzo: defaultAddr?.indirizzo_completo || ''
                    }];
                })
            );

            const rows = [];
            (fogliData || []).forEach(f => {
                const info = clientiMap.get(f.cliente_id);
                if (info) {
                    rows.push({
                        nome_cliente: info.nome,
                        sede_cliente: info.indirizzo,
                        origine: 'Foglio di lavoro',
                        codice: f.numero_foglio || f.id.substring(0, 8)
                    });
                }
            });
            (ordiniData || []).forEach(o => {
                const info = clientiMap.get(o.cliente_id);
                if (info) {
                    rows.push({
                        nome_cliente: info.nome,
                        sede_cliente: info.indirizzo,
                        origine: 'Ordine cliente',
                        codice: o.numero_ordine_cliente || o.id.substring(0, 8)
                    });
                }
            });
            (commesseData || []).forEach(c => {
                const info = clientiMap.get(c.cliente_id);
                if (info) {
                    rows.push({
                        nome_cliente: info.nome,
                        sede_cliente: info.indirizzo,
                        origine: 'Commessa',
                        codice: c.codice_commessa || c.id.substring(0, 8)
                    });
                }
            });

            if (rows.length === 0) {
                alert('Nessun cliente associato a fogli, ordini o commesse.');
                setLoadingActions(false);
                return;
            }

            const headers = ['nome_cliente', 'sede_cliente', 'origine', 'codice'];
            const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'UtilizzoClienti');
            XLSX.writeFile(workbook, 'clienti_utilizzo.xlsx');
            setSuccessMessage('Utilizzo clienti esportato in XLSX!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (expError) {
            setError('Esportazione utilizzo fallita: ' + expError.message);
            console.error('Errore esportazione utilizzo clienti:', expError);
        }
        setLoadingActions(false);
    };
    const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, '_');
    const triggerFileInput = () => fileInputRef.current?.click();

    const handleSearchClienti = () => {
        setError(null);
        fetchClienti(filtroNomeAzienda.trim());
    };

    const resetFiltro = () => {
        setFiltroNomeAzienda('');
        setClienti([]);
        setError(null);
        setRicercaSbloccata(false);
        setCurrentPage(1);
    };

    // --- NUOVA LOGICA DI IMPORTAZIONE CON FEEDBACK DETTAGLIATO ---
    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoadingActions(true);
        setError(null);
        setSuccessMessage('');
        setImportProgress('Inizio elaborazione file...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            let parsedData = [];
            const errorsDetail = [];
            const importLog = [];
            let processedCount = 0;
            let uniqueClienti = 0;
            let managedIndirizzi = 0;
            const clientiCache = new Map();
            let fileReadError = null;

            try {
                const fileContent = e.target.result; 
                if (file.name.endsWith('.csv')) {
                    const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });
                    if (result.errors.length > 0) {
                        fileReadError = "Errore parsing CSV: " + result.errors.map(err => err.message).join(", ");
                    } else {
                        parsedData = result.data;
                    }
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0]; 
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                    parsedData = jsonData.map(row => { 
                        const normRow = {}; 
                        for (const key in row) { normRow[normalizeHeader(key)] = row[key]; } 
                        return normRow; 
                    });
                } else { 
                    fileReadError = "Formato file non supportato. Usare .csv o .xlsx";
                }
                
                if (fileReadError) throw new Error(fileReadError);
                if (parsedData.length === 0) { throw new Error("Il file è vuoto o non contiene dati interpretabili."); }
                
                console.log("Dati letti e normalizzati:", parsedData);
                setImportProgress(`Lette ${parsedData.length} righe. Inizio elaborazione database...`);

                for (let i = 0; i < parsedData.length; i++) {
                    const row = parsedData[i];
                    processedCount++;
                    setImportProgress(`Processo riga ${processedCount} di ${parsedData.length}...`);

                    const nomeAzienda = String(row.nome_azienda || '').trim();
                    const indirizzoCompleto = String(row.indirizzo_completo || row.indirizzo_default || row.indirizzo || '').trim();
                    const descIndirizzo = String(row.descrizione || row.descrizione_indirizzo || row.descrizione_default || '').trim();
                    const isDefaultRaw = String(row.is_default || '').trim().toLowerCase();
                    const isDefault = ['s', 'si', 'sì', 'true', '1', 'yes', 'y'].includes(isDefaultRaw);

                    if (!nomeAzienda) {
                        const msg = `Riga ${i+1}: nome_azienda mancante. Riga saltata.`;
                        errorsDetail.push(msg);
                        importLog.push(msg);
                        continue;
                    }

                    let clienteId = clientiCache.get(nomeAzienda);
                    if (!clienteId) {
                        const { data: clienteUpserted, error: clienteErr } = await supabase
                            .from('clienti')
                            .upsert({ nome_azienda: nomeAzienda }, { onConflict: 'nome_azienda' })
                            .select('id')
                            .single();

                        if (clienteErr) {
                            const msg = `Riga ${i+1} (Cliente "${nomeAzienda}"): Errore DB: ${clienteErr.message}`;
                            errorsDetail.push(msg);
                            importLog.push(msg);
                            console.error(`Errore upsert cliente ${nomeAzienda}:`, clienteErr);
                            continue;
                        }

                        if (!clienteUpserted) {
                            const msg = `Riga ${i+1} (Cliente "${nomeAzienda}"): Upsert cliente non ha restituito un ID.`;
                            errorsDetail.push(msg);
                            importLog.push(msg);
                            continue;
                        }
                        clienteId = clienteUpserted.id;
                        clientiCache.set(nomeAzienda, clienteId);
                        uniqueClienti++;
                        importLog.push(`Riga ${i+1}: cliente '${nomeAzienda}' creato/aggiornato (ID ${clienteId})`);
                    } else {
                        importLog.push(`Riga ${i+1}: cliente '${nomeAzienda}' già noto (ID ${clienteId})`);
                    }

                    if (!indirizzoCompleto) {
                        importLog.push(`Riga ${i+1}: nessun indirizzo specificato, nessuna operazione`);
                        continue;
                    }

                    if (isDefault) {
                        const { error: unsetErr } = await supabase
                            .from('indirizzi_clienti')
                            .update({ is_default: false })
                            .eq('cliente_id', clienteId)
                            .eq('is_default', true);
                        if (unsetErr) {
                            console.warn(`Attenzione per cliente ${nomeAzienda}: Errore nel resettare vecchi indirizzi default - ${unsetErr.message}`);
                        } else {
                            importLog.push(`Riga ${i+1}: reset vecchi indirizzi default per cliente ID ${clienteId}`);
                        }
                    }

                    const { data: existingAddr, error: findErr } = await supabase
                        .from('indirizzi_clienti')
                        .select('id, descrizione, is_default')
                        .eq('cliente_id', clienteId)
                        .eq('indirizzo_completo', indirizzoCompleto)
                        .maybeSingle();

                    if (findErr && findErr.code !== 'PGRST116') {
                        const msg = `Riga ${i+1} (Cliente ${nomeAzienda}): Errore lookup indirizzo - ${findErr.message}`;
                        errorsDetail.push(msg);
                        importLog.push(msg);
                        console.error(`Errore lookup indirizzo per cliente ${nomeAzienda}:`, findErr);
                        continue;
                    }

                    let indirizzoOpError;
                    if (existingAddr) {
                        const updateNeeded = (existingAddr.descrizione || '') !== (descIndirizzo || '') || existingAddr.is_default !== isDefault;
                        if (updateNeeded) {
                            const { error } = await supabase
                                .from('indirizzi_clienti')
                                .update({ descrizione: descIndirizzo || null, is_default: isDefault })
                                .eq('id', existingAddr.id);
                            indirizzoOpError = error;
                            if (!error) importLog.push(`Riga ${i+1}: indirizzo aggiornato (ID ${existingAddr.id})`);
                        } else {
                            importLog.push(`Riga ${i+1}: indirizzo invariato, nessuna modifica (ID ${existingAddr.id})`);
                        }
                    } else {
                        const { error } = await supabase
                            .from('indirizzi_clienti')
                            .insert({
                                cliente_id: clienteId,
                                indirizzo_completo: indirizzoCompleto,
                                descrizione: descIndirizzo || null,
                                is_default: isDefault,
                            });
                        indirizzoOpError = error;
                        if (!error) importLog.push(`Riga ${i+1}: indirizzo inserito per cliente ID ${clienteId}`);
                    }

                    if (indirizzoOpError) {
                        const msg = `Riga ${i+1} (Cliente ${nomeAzienda}): Errore gestione indirizzo - ${indirizzoOpError.message}`;
                        errorsDetail.push(msg);
                        importLog.push(msg);
                        console.warn(`Attenzione per cliente ${nomeAzienda}: Errore gestione indirizzo - ${indirizzoOpError.message}`);
                    } else {
                        managedIndirizzi++;
                    }
                } // Fine ciclo for
                
                if (importLog.length > 0) {
                    console.log('Dettaglio importazione:', importLog);
                } else { 
                    console.log('Importazione terminata senza dettagli di rilievo');
                }

                let finalMessage = `${uniqueClienti} clienti processati. ${managedIndirizzi} indirizzi gestiti.`;
                if (errorsDetail.length > 0) {
                    finalMessage += ` ${errorsDetail.length} righe con errori o avvisi.`;
                    setError(`Errori/Avvisi durante l'importazione: ${errorsDetail.slice(0,3).join('; ')}... Vedi console per tutti i dettagli.`);
                    console.error("Dettaglio errori/avvisi importazione clienti:", errorsDetail);
                }
                finalMessage += ' Controlla la console per il log.';
                setSuccessMessage(finalMessage);
                setTimeout(()=> { setSuccessMessage(''); setError(null); }, 15000); // Più tempo per leggere
                await fetchClienti(filtroNomeAzienda.trim());

            } catch (err) { 
                setError("Errore critico durante l'importazione: " + err.message); 
                console.error("Errore critico importazione clienti:", err); 
            } finally {
                setLoadingActions(false);
                setImportProgress('');
                if(fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        if (file.name.endsWith('.csv')) reader.readAsText(file); 
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) reader.readAsBinaryString(file);
        else { setError("Formato non supportato."); setLoadingActions(false); }
    };
    

    // ---- RENDER ----
    if (pageLoading) return <p>Caricamento anagrafica clienti...</p>;
    if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    if (!session && !pageLoading) return <Navigate to="/login" replace />;

    const totalPages = Math.ceil(clienti.length / RIGHE_PER_PAGINA_CLIENTI) || 1;
    const displayedClienti = clienti.slice(
        (currentPage - 1) * RIGHE_PER_PAGINA_CLIENTI,
        currentPage * RIGHE_PER_PAGINA_CLIENTI
    );

    return (
        <div>
            <h2>Anagrafica Clienti</h2>
            {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap', alignItems:'center' }}>
                    <input 
                        type="file" 
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                        onChange={handleFileSelected} 
                        style={{ display: 'none' }} 
                        ref={fileInputRef} 
                    />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}>
                        {loadingActions && importProgress ? importProgress : (loadingActions ? 'Attendere...' : 'Importa/Aggiorna Clienti')}
                    </button>
                    <div style={{display:'flex', gap: '5px', alignItems:'center'}}>
                        <select value={exportScope} onChange={e => setExportScope(e.target.value)} disabled={loadingActions || clienti.length === 0}>
                            <option value="page">Pag. Corrente</option>
                            <option value="filter">Con Filtri</option>
                            <option value="all">Tutto</option>
                        </select>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || clienti.length === 0}>
                            Esporta CSV
                        </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || clienti.length === 0}>
                            Esporta XLSX
                        </button>
                        <button onClick={handleExportUtilizzoClienti} className="button secondary small" disabled={loadingActions}>
                            Esporta Utilizzo (XLSX)
                        </button>
                    </div>
                </div>
            )}
            
            {successMessage && <p style={{ color: 'green', fontWeight:'bold', border: '1px solid green', padding: '10px', borderRadius:'5px' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold', border: '1px solid red', padding: '10px', borderRadius:'5px', whiteSpace:'pre-wrap' }}>ERRORE: {error}</p>}

            <div className="filtri-container" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', background: '#f9f9f9' }}>
                <h4>Filtro Clienti</h4>
                <div className="filtri-grid" style={{display:'flex', gap:'10px', alignItems:'flex-end'}}>
                    <div>
                        <label htmlFor="filtroNomeCliente">Nome Azienda:</label>
                        <input
                            type="text"
                            id="filtroNomeCliente"
                            value={filtroNomeAzienda}
                            onChange={e => setFiltroNomeAzienda(e.target.value)}
                            placeholder="Min 3 caratteri"
                        />
                    </div>
                    <button onClick={handleSearchClienti} className="button secondary" disabled={loadingActions || pageLoading}>Cerca</button>
                    <button onClick={resetFiltro} className="button secondary" disabled={loadingActions || pageLoading}>Azzera</button>
                    {!ricercaSbloccata && (
                        <button onClick={() => setRicercaSbloccata(true)} className="button warning" disabled={loadingActions || pageLoading}>Sblocca Ricerca</button>
                    )}
                </div>
            </div>

            {canManage && !selectedCliente && (
                <form onSubmit={handleAddNuovoCliente} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px', background:'#f9f9f9' }}>
                    <h3>Nuovo Cliente</h3>
                    <div> 
                        <label htmlFor="formNuovoNomeAzienda">Nome Azienda:</label> 
                        <input type="text" id="formNuovoNomeAzienda" value={formNuovoNomeAzienda} onChange={e => setFormNuovoNomeAzienda(e.target.value)} required /> 
                    </div>
                    <button type="submit" disabled={loadingActions} style={{marginTop:'10px'}} className="button primary">
                        {loadingActions ? 'Creazione...' : 'Crea Nuovo Cliente'}
                    </button>
                </form>
            )}

            <h3>Elenco Clienti</h3>
            {clienti.length === 0 && !pageLoading ? ( <p>Nessun cliente trovato.</p> ) : (
                 <table>
                    <thead>
                        <tr>
                            <th>Nome Azienda</th>
                            <th>Indirizzo Principale</th> 
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedClienti.map(cliente => (
                            <React.Fragment key={cliente.id}>
                                <tr style={selectedCliente && selectedCliente.id === cliente.id ? {backgroundColor: '#e6f7ff', fontWeight:'bold'} : {}}>
                                    <td>{cliente.nome_azienda}</td>
                                    <td>{cliente.indirizzo_default_visualizzato || '-'}</td> 
                                    {canManage && (
                                    <td className="actions">
                                        <button 
                                            className={`button small ${selectedCliente && selectedCliente.id === cliente.id ? 'primary' : 'secondary'}`} 
                                            onClick={() => handleSelectClienteForManagement(cliente)} 
                                            disabled={loadingActions}
                                            title={selectedCliente && selectedCliente.id === cliente.id ? 'Nascondi dettagli e gestione indirizzi' : 'Modifica nome e gestisci indirizzi'}
                                        >
                                            {selectedCliente && selectedCliente.id === cliente.id ? 'Nascondi Dettagli' : 'Gestisci Cliente'}
                                        </button>
                                        <button 
                                            className="button danger small" 
                                            onClick={() => handleDeleteCliente(cliente.id)} 
                                            disabled={loadingActions}
                                            style={{marginLeft:'5px'}}
                                            title="Elimina cliente e tutti i suoi dati associati"
                                        >
                                            Elimina
                                        </button>
                                    </td>
                                    )}
                                </tr>
                                {/* Sezione Dettaglio e Gestione Indirizzi */}
                                {selectedCliente && selectedCliente.id === cliente.id && (
                                    <tr>
                                        <td colSpan={canManage ? 3 : 2} style={{padding: '20px', backgroundColor: '#f0f8ff', borderTop: '2px solid #007bff'}}>
                                            <h4>Gestione Cliente: {selectedCliente.nome_azienda}</h4>
                                            <form onSubmit={handleUpdateNomeClienteSelezionato} style={{display:'flex', gap:'10px', alignItems:'flex-end', marginBottom:'15px', paddingBottom:'15px', borderBottom:'1px dashed #ccc'}}>
                                                <div style={{flexGrow:1}}>
                                                    <label htmlFor={`formEditNomeAzienda-${selectedCliente.id}`}>Modifica Nome Azienda:</label>
                                                    <input style={{width:'100%'}} type="text" id={`formEditNomeAzienda-${selectedCliente.id}`} value={formEditNomeAzienda} onChange={e => setFormEditNomeAzienda(e.target.value)} required />
                                                </div>
                                                <button type="submit" disabled={loadingActions} className="button small primary">Salva Nome</button>
                                            </form>
                                            
                                            <h5>Indirizzi Associati:</h5>
                                            {loadingIndirizzi ? <p>Caricamento indirizzi...</p> : (
                                                indirizziClienteCorrente.length > 0 ? (
                                                    <ul style={{listStyle:'none', padding:0, margin:0}}>
                                                        {indirizziClienteCorrente.map(addr => (
                                                            <li key={addr.id} style={{borderBottom:'1px solid #eee', padding:'10px 0', display:'flex', flexWrap:'wrap', alignItems:'center', gap:'10px'}}>
                                                                {editingIndirizzo && editingIndirizzo.id === addr.id ? (
                                                                    <>
                                                                        <input type="text" value={formEditIndirizzoDescrizione} onChange={e => setFormEditIndirizzoDescrizione(e.target.value)} placeholder="Descrizione" style={{flex:'1 1 150px', padding:'6px', border:'1px solid #ccc', borderRadius:'3px', marginBottom:'5px'}}/>
                                                                        <input type="text" value={formEditIndirizzoCompleto} onChange={e => setFormEditIndirizzoCompleto(e.target.value)} placeholder="Indirizzo completo" required style={{flex:'2 1 250px', padding:'6px', border:'1px solid #ccc', borderRadius:'3px', marginBottom:'5px'}}/>
                                                                        <div style={{display:'flex', gap:'5px', width:'100%', justifyContent:'flex-start', marginTop:'5px'}}>
                                                                            <button onClick={handleSaveEditIndirizzo} className="button success small" disabled={loadingActions}>Salva</button>
                                                                            <button type="button" onClick={handleCancelEditIndirizzo} className="button secondary small" disabled={loadingActions}>Annulla</button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div style={{flexGrow:1}}>
                                                                            <strong>{addr.descrizione || 'Indirizzo'}:</strong> {addr.indirizzo_completo}
                                                                            {addr.is_default && <span className="status-badge status-default" style={{marginLeft:'10px'}}>Default</span>}
                                                                        </div>
                                                                        {!addr.is_default && <button onClick={() => handleSetDefaultIndirizzoCliente(addr.id)} className="button outline small" disabled={loadingActions}>Imposta Default</button>}
                                                                        <button onClick={() => handleStartEditIndirizzo(addr)} className="button secondary small" disabled={loadingActions}>Mod.</button>
                                                                        <button onClick={() => handleDeleteIndirizzoCliente(addr.id)} className="button danger small" disabled={loadingActions}>Elim.</button>
                                                                    </>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <p>Nessun indirizzo specifico. Aggiungine uno sotto.</p>
                                            )}
                                            
                                            {!editingIndirizzo && ( 
                                                <div style={{marginTop:'20px', paddingTop:'15px', borderTop:'1px solid #ccc'}}>
                                                    <h6>Aggiungi Nuovo Indirizzo a "{selectedCliente.nome_azienda}"</h6>
                                                    <form onSubmit={(e) => {e.preventDefault(); handleAddIndirizzoCliente();}} style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end'}}>
                                                        <div style={{flex:'1 1 200px'}}>
                                                            <label htmlFor={`formNuovaDescrizioneIndirizzo-${selectedCliente.id}`}>Descrizione</label>
                                                            <input type="text" id={`formNuovaDescrizioneIndirizzo-${selectedCliente.id}`} value={formNuovaDescrizioneIndirizzo} onChange={e=> setFormNuovaDescrizioneIndirizzo(e.target.value)} placeholder="Es. Sede Operativa"/>
                                                        </div>
                                                        <div style={{flex:'2 1 300px'}}>
                                                            <label htmlFor={`formNuovoIndirizzoCompleto-${selectedCliente.id}`}>Indirizzo Completo</label>
                                                            <input type="text" id={`formNuovoIndirizzoCompleto-${selectedCliente.id}`} value={formNuovoIndirizzoCompleto} onChange={e=> setFormNuovoIndirizzoCompleto(e.target.value)} placeholder="Via, n°, CAP, Città (Prov)" required />
                                                        </div>
                                                        <button type="submit" disabled={loadingActions} className="button primary">Aggiungi Indirizzo</button>
                                                    </form>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
            {totalPages > 1 && (
                <div className="pagination-controls" style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1 || loadingActions || pageLoading}
                        className="button small"
                    >
                        Inizio
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loadingActions || pageLoading}
                        className="button small"
                        style={{ marginLeft: '5px' }}
                    >
                        Indietro
                    </button>
                    <span style={{ margin: '0 10px' }}>Pagina {currentPage} di {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || loadingActions || pageLoading}
                        className="button small"
                    >
                        Avanti
                    </button>
                    <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages || loadingActions || pageLoading}
                        className="button small"
                        style={{ marginLeft: '5px' }}
                    >
                        Fine
                    </button>
                </div>
            )}
        </div>
    );
}
export default ClientiManager;