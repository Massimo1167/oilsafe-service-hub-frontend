/**
 * Lists service sheets ("fogli assistenza") with filters and bulk actions.
 * Fetches data via Supabase and uses pdfGenerator.js for printing.
 * Receives anagrafiche (clients, technicians, etc.) as props from App.jsx.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Assicurati che il percorso sia corretto
import { generateFoglioAssistenzaPDF } from '../utils/pdfGenerator'; // Assicurati che il percorso sia corretto
import { STATO_FOGLIO_STEPS } from '../utils/statoFoglio';

// Questo componente ora riceve le anagrafiche principali come props da App.jsx
// per evitare di doverle ricaricare qui. Questo migliora le performance e la consistenza.
function FogliAssistenzaListPage({ session, loadingAnagrafiche, clienti: allClienti, tecnici: allTecnici, commesse: allCommesse, ordini: allOrdini }) {
    const [fogli, setFogli] = useState([]); // I dati grezzi dal server, arricchiti con i nomi
    const [loadingFogli, setLoadingFogli] = useState(true); // Stato di caricamento specifico per i fogli
    const [error, setError] = useState(null);
    const [selectedFogli, setSelectedFogli] = useState(new Set());
    const [stampaLoading, setStampaLoading] = useState(false);
    const [copyLoading, setCopyLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    // Imposta il layout di stampa predefinito su quello dettagliato
    const [layoutStampa, setLayoutStampa] = useState('detailed');
    const [successMessage, setSuccessMessage] = useState('');
    // Stati per la preview PDF
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Stati per i campi di filtro
    const [filtroDataDa, setFiltroDataDa] = useState('');
    const [filtroDataA, setFiltroDataA] = useState('');
    const [filtroClienteTesto, setFiltroClienteTesto] = useState('');
    const [filtroTecnicoTesto, setFiltroTecnicoTesto] = useState('');
    const [filtroCommessaTesto, setFiltroCommessaTesto] = useState('');
    const [filtroOrdineTesto, setFiltroOrdineTesto] = useState('');
    const [filtroStato, setFiltroStato] = useState(''); // NUOVO STATO PER IL FILTRO STATO ('' significa 'Tutti')
    const [filtroDaStampare, setFiltroDaStampare] = useState(false); // Filtro per mostrare solo fogli da stampare

    // Stati per la paginazione
    const [righePerPagina, setRighePerPagina] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalFogli, setTotalFogli] = useState(0);

    const [sortConfig, setSortConfig] = useState({ column: '', direction: 'asc' });

    // Stato per pianificazioni (per mostrare badge)
    const [pianificazioniMap, setPianificazioniMap] = useState({}); // foglioId -> count pianificazioni attive

    const navigate = useNavigate();
    const userRole = (session?.user?.role || '').trim().toLowerCase();
    const currentUserId = session?.user?.id;

    // Funzione per caricare i dati dei fogli dal server
    const fetchFogliDaServer = useCallback(async () => {
        // Non eseguire il fetch se la sessione non c'è o se le anagrafiche stanno ancora caricando
        if (!session || loadingAnagrafiche) {
            setLoadingFogli(true); // Mantieni la pagina in stato di caricamento
            return;
        }

        setLoadingFogli(true);
        setError(null);

        // Calcola range per paginazione
        const from = (currentPage - 1) * righePerPagina;
        const to = currentPage * righePerPagina - 1;

        let query = supabase
            .from('fogli_assistenza')
            .select(`
                id, numero_foglio, data_apertura_foglio, stato_foglio, creato_da_user_id,
                assegnato_a_user_id,
                profilo_tecnico_assegnato:profiles (full_name),
                cliente_id, commessa_id, ordine_cliente_id,
                email_report_cliente, email_report_interno,
                motivo_intervento_generale,
                ultima_data_stampa, richiesta_nuova_stampa,
                interventi_assistenza!left(tecnico_id, tecnici (email))
            `, { count: 'exact' })
            .order('numero_foglio', { ascending: false });

        // Applica filtri server-side (solo per data, che è più efficiente)
        if (filtroDataDa) query = query.gte('data_apertura_foglio', filtroDataDa);
        if (filtroDataA) {
            const dataAEndDate = new Date(filtroDataA);
            dataAEndDate.setDate(dataAEndDate.getDate() + 1);
            query = query.lt('data_apertura_foglio', dataAEndDate.toISOString().split('T')[0]);
        }

        // Filtro per fogli da stampare
        if (filtroDaStampare) {
            query = query.eq('richiesta_nuova_stampa', true);
        }

        // Applica paginazione
        query = query.range(from, to);

        const { data, error: fetchError, count } = await query;

        // Salva il totale dei fogli trovati
        setTotalFogli(count || 0);

        if (fetchError) {
            console.error('Errore fetch fogli da server:', fetchError);
            setError(fetchError.message);
            setFogli([]);
        } else {
            // Assicura che le anagrafiche siano array prima di fare .find() per evitare errori
            const safeAllClienti = Array.isArray(allClienti) ? allClienti : [];
            const safeAllCommesse = Array.isArray(allCommesse) ? allCommesse : [];
            const safeAllOrdini = Array.isArray(allOrdini) ? allOrdini : [];
            const safeAllTecnici = Array.isArray(allTecnici) ? allTecnici : [];

            // Post-processamento per "arricchire" i dati con nomi e codici leggibili
            const processedFogli = (data || []).map(foglio => {
                const cliente = safeAllClienti.find(c => c.id === foglio.cliente_id);
                const commessa = safeAllCommesse.find(c => c.id === foglio.commessa_id);
                const ordine = safeAllOrdini.find(o => o.id === foglio.ordine_cliente_id);
                
                const tecniciNomiSet = new Set();
                if (foglio.interventi_assistenza && Array.isArray(foglio.interventi_assistenza)) {
                    foglio.interventi_assistenza.forEach(intervento => {
                        if (intervento && intervento.tecnico_id) {
                            const tecnicoTrovato = safeAllTecnici.find(t => t.id === intervento.tecnico_id);
                            if (tecnicoTrovato) {
                                tecniciNomiSet.add(`${tecnicoTrovato.nome} ${tecnicoTrovato.cognome}`);
                            }
                        }
                    });
                }
                const tecnicoAssegnato = safeAllTecnici.find(t => t.user_id === foglio.assegnato_a_user_id);
                return {
                    ...foglio,
                    cliente_nome_azienda: cliente?.nome_azienda || 'N/D',
                    commessa_codice: commessa?.codice_commessa || '-',
                    ordine_numero: ordine?.numero_ordine_cliente || '-',
                    motivo_intervento_generale: foglio.motivo_intervento_generale,
                    nomi_tecnici_coinvolti: Array.from(tecniciNomiSet).join(', ') || 'Nessuno',
                    tecnico_assegnato_nome: tecnicoAssegnato ? `${tecnicoAssegnato.nome} ${tecnicoAssegnato.cognome}` : (foglio.profilo_tecnico_assegnato?.full_name || 'N/D'),
                };
            });
            setFogli(processedFogli);
        }
        setLoadingFogli(false);
    }, [loadingAnagrafiche, userRole, currentUserId, filtroDataDa, filtroDataA, filtroDaStampare, currentPage, righePerPagina, allClienti, allCommesse, allOrdini, allTecnici]);

    // Funzione per caricare pianificazioni attive per ogni foglio
    const fetchPianificazioni = useCallback(async () => {
        if (!session || userRole !== 'admin' && userRole !== 'manager') {
            // Solo admin/manager vedono le pianificazioni
            return;
        }

        try {
            const { data, error } = await supabase
                .from('pianificazioni')
                .select('id, foglio_assistenza_id, stato_pianificazione')
                .in('stato_pianificazione', ['Pianificata', 'Confermata', 'In Corso']);

            if (error) {
                console.error('Errore caricamento pianificazioni:', error);
                return;
            }

            // Crea mappa foglioId -> count
            const map = {};
            (data || []).forEach((p) => {
                const foglioId = p.foglio_assistenza_id;
                map[foglioId] = (map[foglioId] || 0) + 1;
            });
            setPianificazioniMap(map);
        } catch (err) {
            console.error('Errore fetch pianificazioni:', err);
        }
    }, [session, userRole]);

    // useEffect per il fetch con debounce (per i filtri data)
    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            fetchFogliDaServer();
            fetchPianificazioni();
        }, 300);
        return () => clearTimeout(debounceTimeout);
    }, [fetchFogliDaServer, fetchPianificazioni]);

    // useMemo per applicare tutti i filtri testuali e di stato (client-side)
    const fogliFiltrati = useMemo(() => {
        let dataDaFiltrare = [...fogli];
        
        // Filtro per stato
        if (filtroStato) {
            dataDaFiltrare = dataDaFiltrare.filter(f => f.stato_foglio === filtroStato);
        }
        // Filtri testuali
        if (filtroClienteTesto.trim()) { dataDaFiltrare = dataDaFiltrare.filter(f => f.cliente_nome_azienda.toLowerCase().includes(filtroClienteTesto.toLowerCase())); }
        if (filtroCommessaTesto.trim()) { dataDaFiltrare = dataDaFiltrare.filter(f => f.commessa_codice.toLowerCase().includes(filtroCommessaTesto.toLowerCase())); }
        if (filtroOrdineTesto.trim()) { dataDaFiltrare = dataDaFiltrare.filter(f => f.ordine_numero.toLowerCase().includes(filtroOrdineTesto.toLowerCase())); }
        if (filtroTecnicoTesto.trim()) {
            dataDaFiltrare = dataDaFiltrare.filter(f =>
                (f.nomi_tecnici_coinvolti || '').toLowerCase().includes(filtroTecnicoTesto.toLowerCase())
            );
        }
        
        return dataDaFiltrare;
    }, [fogli, filtroStato, filtroClienteTesto, filtroCommessaTesto, filtroOrdineTesto, filtroTecnicoTesto]);

    const sortedFogli = useMemo(() => {
        const sorted = [...fogliFiltrati];
        if (sortConfig.column) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.column];
                let bVal = b[sortConfig.column];
                if (sortConfig.column === 'data_apertura_foglio') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else {
                    aVal = aVal === undefined || aVal === null ? '' : aVal.toString().toLowerCase();
                    bVal = bVal === undefined || bVal === null ? '' : bVal.toString().toLowerCase();
                }
                if (aVal < bVal) return -1;
                if (aVal > bVal) return 1;
                return 0;
            });
            if (sortConfig.direction === 'desc') sorted.reverse();
        }
        return sorted;
    }, [fogliFiltrati, sortConfig]);

    // Resetta la selezione quando i filtri cambiano
    useEffect(() => {
        setSelectedFogli(new Set());
    }, [fogliFiltrati]);

    const handleSelectFoglio = (foglioId) => {
        setSelectedFogli(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(foglioId)) newSelected.delete(foglioId);
            else newSelected.add(foglioId);
            return newSelected;
        });
    };

    const handleSelectAllFogli = (e) => {
        if (e.target.checked) { setSelectedFogli(new Set(fogliFiltrati.map(f => f.id))); }
        else { setSelectedFogli(new Set()); }
    };

    const handleSort = (column) => {
        setSortConfig(prev => {
            if (prev.column === column) {
                return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { column, direction: 'asc' };
        });
    };

    // Gestione paginazione
    const totalPages = Math.ceil(totalFogli / righePerPagina);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleRighePerPaginaChange = (nuovoValore) => {
        const valore = parseInt(nuovoValore, 10);
        if (!isNaN(valore) && valore > 0) {
            setRighePerPagina(valore);
            setCurrentPage(1); // Reset alla prima pagina
        }
    };

    // Reset pagina quando cambiano i filtri
    const resetPaginaEImpostaFiltro = (setter, value) => {
        setter(value);
        setCurrentPage(1);
    };

    const handlePrintSelected = async () => {
        if (selectedFogli.size === 0) { alert("Seleziona almeno un foglio di assistenza da stampare."); return; }
        setStampaLoading(true); setError(null); setSuccessMessage('');
        let printErrors = [];
        for (const foglioId of Array.from(selectedFogli)) {
            try {
                const { data: foglioData, error: foglioError } = await supabase.from('fogli_assistenza').select(`*, assegnato_a_user_id, profilo_tecnico_assegnato:profiles (full_name), clienti (*), commesse (*), ordini_cliente (*), indirizzi_clienti!indirizzo_intervento_id (*)`).eq('id', foglioId).single();
                if (foglioError || !foglioData) throw new Error(foglioError?.message || `Foglio ${foglioId} non trovato.`);
                const tecnicoAss = (allTecnici || []).find(t => t.user_id === foglioData.assegnato_a_user_id);
                foglioData.tecnico_assegnato_nome = tecnicoAss ? `${tecnicoAss.nome} ${tecnicoAss.cognome}` : foglioData.profilo_tecnico_assegnato?.full_name || null;

                const { data: interventiData, error: interventiError } = await supabase
                    .from('interventi_assistenza')
                    .select(`
                        *,
                        tecnici (*),
                        mansioni (*),
                        interventi_attivita_standard (
                            id,
                            codice_attivita,
                            descrizione,
                            unita_misura,
                            costo_unitario,
                            quantita,
                            costo_totale
                        )
                    `)
                    .eq('foglio_assistenza_id', foglioId)
                    .order('data_intervento_effettivo');
                if (interventiError) console.warn(`Attenzione: Errore nel recuperare gli interventi per il foglio ${foglioId}: ${interventiError.message}`);

                // Carica attività previste per questo foglio
                const { data: attivitaPreviste, error: attivitaError } = await supabase
                    .from('fogli_attivita_standard')
                    .select(`
                        attivita_standard_id,
                        obbligatoria,
                        attivita_standard_clienti (
                            codice_attivita,
                            descrizione,
                            costo_unitario,
                            unita_misura (codice)
                        )
                    `)
                    .eq('foglio_assistenza_id', foglioId);
                if (attivitaError) console.warn(`Attenzione: Errore nel recuperare le attività previste per il foglio ${foglioId}: ${attivitaError.message}`);

                await generateFoglioAssistenzaPDF(foglioData, interventiData || [], attivitaPreviste || [], { layout: layoutStampa });

                // Aggiorna tracciamento stampa nel database
                const { error: updateError } = await supabase
                    .from('fogli_assistenza')
                    .update({
                        ultima_data_stampa: new Date().toISOString(),
                        richiesta_nuova_stampa: false
                    })
                    .eq('id', foglioId);

                if (updateError) {
                    console.error(`Errore aggiornamento tracciamento stampa per foglio ${foglioId}:`, updateError);
                }
            } catch (err) {
                console.error(`Errore durante la generazione del PDF per il foglio ${foglioId}:`, err);
                printErrors.push(`Foglio ${foglioId.substring(0,8)}: ${err.message}`);
            }
        }
        if (printErrors.length > 0) { setError(`Si sono verificati errori durante la stampa:\n${printErrors.join('\n')}`); }
        else { setSuccessMessage(`Operazione di stampa PDF completata per ${selectedFogli.size} fogli.`); setTimeout(() => setSuccessMessage(''), 3000); }
        setStampaLoading(false); setSelectedFogli(new Set());
        // Ricarica i dati per aggiornare le colonne di stampa
        fetchFogliDaServer();
    };

    const handlePreviewSelected = async () => {
        if (selectedFogli.size === 0) { alert("Seleziona almeno un foglio di assistenza per la preview."); return; }
        setPreviewLoading(true); setError(null);

        // Prendi solo il primo foglio selezionato per la preview
        const foglioId = Array.from(selectedFogli)[0];

        try {
            const { data: foglioData, error: foglioError } = await supabase.from('fogli_assistenza').select(`*, assegnato_a_user_id, profilo_tecnico_assegnato:profiles (full_name), clienti (*), commesse (*), ordini_cliente (*), indirizzi_clienti!indirizzo_intervento_id (*)`).eq('id', foglioId).single();
            if (foglioError || !foglioData) throw new Error(foglioError?.message || `Foglio ${foglioId} non trovato.`);
            const tecnicoAss = (allTecnici || []).find(t => t.user_id === foglioData.assegnato_a_user_id);
            foglioData.tecnico_assegnato_nome = tecnicoAss ? `${tecnicoAss.nome} ${tecnicoAss.cognome}` : foglioData.profilo_tecnico_assegnato?.full_name || null;

            const { data: interventiData, error: interventiError } = await supabase
                .from('interventi_assistenza')
                .select(`
                    *,
                    tecnici (*),
                    mansioni (*),
                    interventi_attivita_standard (
                        id,
                        codice_attivita,
                        descrizione,
                        unita_misura,
                        costo_unitario,
                        quantita,
                        costo_totale
                    )
                `)
                .eq('foglio_assistenza_id', foglioId)
                .order('data_intervento_effettivo');
            if (interventiError) console.warn(`Attenzione: Errore nel recuperare gli interventi per il foglio ${foglioId}: ${interventiError.message}`);

            // Carica attività previste per questo foglio
            const { data: attivitaPreviste, error: attivitaError } = await supabase
                .from('fogli_attivita_standard')
                .select(`
                    attivita_standard_id,
                    obbligatoria,
                    attivita_standard_clienti (
                        codice_attivita,
                        descrizione,
                        costo_unitario,
                        unita_misura (codice)
                    )
                `)
                .eq('foglio_assistenza_id', foglioId);
            if (attivitaError) console.warn(`Attenzione: Errore nel recuperare le attività previste per il foglio ${foglioId}: ${attivitaError.message}`);

            // Genera PDF in modalità preview (ritorna DataURL invece di salvare)
            const pdfDataUrl = await generateFoglioAssistenzaPDF(foglioData, interventiData || [], attivitaPreviste || [], { layout: layoutStampa, preview: true });

            setPreviewPdfUrl(pdfDataUrl);
            setShowPreview(true);
        } catch (err) {
            console.error(`Errore durante la generazione della preview per il foglio ${foglioId}:`, err);
            setError(`Errore durante la generazione della preview: ${err.message}`);
        }

        setPreviewLoading(false);
    };

    const handleCopySelected = async () => {
        if (selectedFogli.size === 0) { alert("Seleziona almeno un foglio di assistenza da copiare."); return; }
        if (!window.confirm(`Copiare ${selectedFogli.size} fogli selezionati?`)) return;
        setCopyLoading(true); setError(null); setSuccessMessage('');
        let copyErrors = [];
        for (const foglioId of Array.from(selectedFogli)) {
            try {
                const { data: foglioData, error: foglioError } = await supabase.from('fogli_assistenza').select('*').eq('id', foglioId).single();
                if (foglioError || !foglioData) throw new Error(foglioError?.message || `Foglio ${foglioId} non trovato.`);

                const { data: numeroData, error: numeroError } = await supabase.rpc('genera_prossimo_numero_foglio');
                if (numeroError) throw new Error(numeroError.message);

                const { id, created_at, updated_at, numero_foglio, ...copyFields } = foglioData;
                const foglioPayload = { ...copyFields, numero_foglio: numeroData };
                if ((userRole === 'user' || userRole === 'manager') && currentUserId) {
                    foglioPayload.creato_da_user_id = currentUserId;
                }

                const { data: newFoglio, error: insertError } = await supabase.from('fogli_assistenza').insert([foglioPayload]).select().single();
                if (insertError) throw insertError;

                const { data: interventiData, error: intError } = await supabase.from('interventi_assistenza').select('*').eq('foglio_assistenza_id', foglioId);
                if (intError) throw intError;

                if (interventiData && interventiData.length > 0) {
                    const interventiToInsert = interventiData.map(int => {
                        const { id, created_at, updated_at, ...rest } = int;
                        return { ...rest, foglio_assistenza_id: newFoglio.id };
                    });
                    const { error: insError } = await supabase.from('interventi_assistenza').insert(interventiToInsert);
                    if (insError) throw insError;
                }
            } catch (err) {
                console.error(`Errore copia foglio ${foglioId}:`, err);
                copyErrors.push(`Foglio ${foglioId.substring(0,8)}: ${err.message}`);
            }
        }
        if (copyErrors.length > 0) { setError(`Si sono verificati errori durante la copia:\n${copyErrors.join('\n')}`); }
        else { setSuccessMessage(`Copia completata per ${selectedFogli.size} fogli.`); setTimeout(() => setSuccessMessage(''), 3000); }
        setCopyLoading(false); setSelectedFogli(new Set());
        fetchFogliDaServer();
    };

    const handleExportSelected = async () => {
        if (selectedFogli.size === 0) { alert('Seleziona almeno un foglio di assistenza da esportare.'); return; }
        setExportLoading(true); setError(null); setSuccessMessage('');
        const headers = [
            'numero_foglio',
            'data_apertura',
            'cliente',
            'indirizzo_intervento',
            'referente_richiesta',
            'tecnico_assegnato',
            'motivo_intervento',
            'materiali_forniti',
            'commessa',
            'ordine_cliente',
            'km_totali',
            'ore_viaggio_tecnici',
            'ore_lavoro_tecnici',
            'stato'
        ];
        const rows = [];
        for (const foglioId of Array.from(selectedFogli)) {
            try {
                const { data: foglioData, error: foglioError } = await supabase
                    .from('fogli_assistenza')
                    .select(`
                        numero_foglio,
                        data_apertura_foglio,
                        stato_foglio,
                        referente_cliente_richiesta,
                        motivo_intervento_generale,
                        materiali_forniti_generale,
                        assegnato_a_user_id,
                        profilo_tecnico_assegnato:profiles (full_name),
                        clienti (nome_azienda),
                        indirizzi_clienti!indirizzo_intervento_id (indirizzo_completo, descrizione),
                        commesse (codice_commessa),
                        ordini_cliente (numero_ordine_cliente)
                    `)
                    .eq('id', foglioId)
                    .single();
                if (foglioError || !foglioData) throw new Error(foglioError?.message || `Foglio ${foglioId} non trovato.`);

                const { data: interventiData, error: intervError } = await supabase
                    .from('interventi_assistenza')
                    .select('km_percorsi, ore_viaggio, ore_lavoro_effettive, numero_tecnici')
                    .eq('foglio_assistenza_id', foglioId);
                if (intervError) throw intervError;

                let kmTot = 0; let oreVia = 0; let oreLav = 0;
                (interventiData || []).forEach(int => {
                    const numTec = parseFloat(int.numero_tecnici) || 1;
                    kmTot += parseFloat(int.km_percorsi) || 0;
                    oreVia += (parseFloat(int.ore_viaggio) || 0) * numTec;
                    oreLav += (parseFloat(int.ore_lavoro_effettive) || 0) * numTec;
                });

                const tecnicoAss = (allTecnici || []).find(t => t.user_id === foglioData.assegnato_a_user_id);
                const tecnicoNome = tecnicoAss ? `${tecnicoAss.nome} ${tecnicoAss.cognome}` : (foglioData.profilo_tecnico_assegnato?.full_name || 'N/D');

                let indirizzoInterv = 'N/D';
                if (foglioData.indirizzi_clienti && foglioData.indirizzi_clienti.indirizzo_completo) {
                    indirizzoInterv = foglioData.indirizzi_clienti.indirizzo_completo;
                    if (foglioData.indirizzi_clienti.descrizione) {
                        indirizzoInterv = `${foglioData.indirizzi_clienti.descrizione}: ${indirizzoInterv}`;
                    }
                }

                rows.push({
                    numero_foglio: foglioData.numero_foglio || foglioId.substring(0, 8),
                    data_apertura: foglioData.data_apertura_foglio,
                    cliente: foglioData.clienti?.nome_azienda || 'N/D',
                    indirizzo_intervento: indirizzoInterv,
                    referente_richiesta: foglioData.referente_cliente_richiesta || 'N/D',
                    tecnico_assegnato: tecnicoNome,
                    motivo_intervento: foglioData.motivo_intervento_generale || 'N/D',
                    materiali_forniti: foglioData.materiali_forniti_generale || 'N/D',
                    commessa: foglioData.commesse?.codice_commessa || '-',
                    ordine_cliente: foglioData.ordini_cliente?.numero_ordine_cliente || '-',
                    km_totali: kmTot.toFixed(1),
                    ore_viaggio_tecnici: oreVia.toFixed(2),
                    ore_lavoro_tecnici: oreLav.toFixed(2),
                    stato: foglioData.stato_foglio || '-'
                });
            } catch (err) {
                console.error(`Errore export foglio ${foglioId}:`, err);
                rows.push({ numero_foglio: foglioId.substring(0,8), errore: err.message });
            }
        }
        try {
            const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'FogliAssistenza');
            XLSX.writeFile(workbook, 'consuntivo_fogli_assistenza.xlsx');
            setSuccessMessage(`Esportazione completata per ${rows.length} fogli.`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (expError) {
            console.error('Errore esportazione fogli assistenza:', expError);
            setError('Esportazione fallita: ' + expError.message);
        }
        setExportLoading(false);
    };

    const handleViewCalendar = () => {
        if (selectedFogli.size === 0) {
            alert('Seleziona almeno un foglio di assistenza da visualizzare sul calendario.');
            return;
        }
        const foglioIds = Array.from(selectedFogli).join(',');
        navigate(`/fogli-assistenza/calendario?fogli=${foglioIds}`);
    };

    const resetAllFilters = () => {
        setFiltroDataDa(''); setFiltroDataA('');
        setFiltroClienteTesto(''); setFiltroTecnicoTesto('');
        setFiltroCommessaTesto(''); setFiltroOrdineTesto('');
        setFiltroStato(''); // Resetta anche il filtro stato
        setFiltroDaStampare(false); // Resetta filtro da stampare
    };

    if (loadingAnagrafiche || loadingFogli) {
        return <p>Caricamento fogli di assistenza...</p>;
    }
    if (!session) { return <Navigate to="/login" replace />; }

    return (
        <div>
            <h2>Elenco Fogli di Assistenza</h2>
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold', whiteSpace:'pre-wrap' }}>ERRORE: {error}</p>}

            <div className="filtri-container">
                <h4>Filtri di Ricerca</h4>
                <div className="filtri-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '15px',
                    marginBottom: '15px'
                }}>
                    {/* RIGA 1: Da Data | A Data | Tecnico | (vuoto) */}
                    <div>
                        <label htmlFor="filtroDataDa">Da Data Apertura:</label>
                        <input
                            type="date"
                            id="filtroDataDa"
                            value={filtroDataDa}
                            onChange={e => resetPaginaEImpostaFiltro(setFiltroDataDa, e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="filtroDataA">A Data Apertura:</label>
                        <input
                            type="date"
                            id="filtroDataA"
                            value={filtroDataA}
                            onChange={e => resetPaginaEImpostaFiltro(setFiltroDataA, e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="filtroTecnicoTesto">Tecnico Coinvolto:</label>
                        <input
                            type="text"
                            id="filtroTecnicoTesto"
                            placeholder="Cerca nome tecnico..."
                            value={filtroTecnicoTesto}
                            onChange={e => resetPaginaEImpostaFiltro(setFiltroTecnicoTesto, e.target.value)}
                        />
                    </div>
                    <div></div> {/* cella vuota */}

                    {/* RIGA 2: Cliente | Ordine | Commessa | Stato */}
                    <div>
                        <label htmlFor="filtroClienteTesto">Cliente:</label>
                        <input
                            type="text"
                            id="filtroClienteTesto"
                            placeholder="Cerca nome cliente..."
                            value={filtroClienteTesto}
                            onChange={e => resetPaginaEImpostaFiltro(setFiltroClienteTesto, e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="filtroOrdineTesto">Ordine Cliente:</label>
                        <input
                            type="text"
                            id="filtroOrdineTesto"
                            placeholder="Cerca numero ordine..."
                            value={filtroOrdineTesto}
                            onChange={e => resetPaginaEImpostaFiltro(setFiltroOrdineTesto, e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="filtroCommessaTesto">Commessa:</label>
                        <input
                            type="text"
                            id="filtroCommessaTesto"
                            placeholder="Cerca codice commessa..."
                            value={filtroCommessaTesto}
                            onChange={e => resetPaginaEImpostaFiltro(setFiltroCommessaTesto, e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="filtroStato">Stato Foglio:</label>
                        <select
                            id="filtroStato"
                            value={filtroStato}
                            onChange={e => resetPaginaEImpostaFiltro(setFiltroStato, e.target.value)}
                        >
                            <option value="">Tutti gli Stati</option>
                            {STATO_FOGLIO_STEPS.map(st => (
                                <option key={st} value={st}>{st}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filtro Da Stampare */}
                <div style={{ marginTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={filtroDaStampare}
                            onChange={e => {
                                setFiltroDaStampare(e.target.checked);
                                setCurrentPage(1);
                            }}
                        />
                        <span style={{
                            backgroundColor: filtroDaStampare ? '#dc3545' : 'transparent',
                            color: filtroDaStampare ? 'white' : 'inherit',
                            padding: filtroDaStampare ? '2px 8px' : '0',
                            borderRadius: '4px',
                            fontWeight: filtroDaStampare ? 'bold' : 'normal'
                        }}>
                            Mostra solo fogli da stampare
                        </span>
                    </label>
                </div>

                {/* Controlli: Azzera Filtri + Paginazione */}
                <div style={{display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <button
                        onClick={resetAllFilters}
                        className="button secondary"
                        disabled={loadingFogli || stampaLoading}
                    >
                        Azzera Filtri
                    </button>

                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <label htmlFor="righePerPagina" style={{margin: 0}}>Max fogli:</label>
                        <input
                            type="number"
                            id="righePerPagina"
                            min="1"
                            max="500"
                            value={righePerPagina}
                            onChange={e => handleRighePerPaginaChange(e.target.value)}
                            style={{width: '70px', padding: '4px'}}
                        />
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-controls" style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1 || loadingFogli}
                                className="button secondary small"
                            >
                                Pagina Indietro
                            </button>
                            <span style={{fontWeight: '600'}}>
                                Pagina {currentPage} di {totalPages}
                            </span>
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages || loadingFogli}
                                className="button secondary small"
                            >
                                Pagina Avanti
                            </button>
                        </div>
                    )}

                    <span style={{marginLeft: 'auto', fontSize: '0.9em', color: '#666'}}>
                        Totale fogli: {totalFogli}
                    </span>
                </div>
            </div>
            
            <div className="azioni-gruppo" style={{ margin: '20px 0', display: 'flex', gap: '10px', alignItems: 'center' }}>
                {(userRole === 'admin' || userRole === 'manager' || userRole === 'user') && (
                    <Link to="/fogli-assistenza/nuovo" className="button">
                        Nuovo Foglio Assistenza
                    </Link>
                )}

                <select value={layoutStampa} onChange={e => setLayoutStampa(e.target.value)}>
                    <option value="table">Layout Compatto</option>
                    <option value="detailed">Layout Dettagliato</option>
                    {userRole === 'admin' && <option value="detailed_with_costs">Layout Dettagliato con costi</option>}
                </select>

                {fogliFiltrati.length > 0 && (
                    <button
                        onClick={handlePreviewSelected}
                        disabled={selectedFogli.size === 0 || previewLoading || loadingFogli}
                        className="button secondary"
                    >
                        {previewLoading ? 'Caricamento...' : `Preview (${selectedFogli.size > 0 ? '1' : '0'})`}
                    </button>
                )}
                {fogliFiltrati.length > 0 && (
                    <button
                        onClick={handlePrintSelected}
                        disabled={selectedFogli.size === 0 || stampaLoading || loadingFogli}
                        className="button primary"
                    >
                        {stampaLoading ? `Stampa... (${selectedFogli.size})` : `Stampa Selezionati (${selectedFogli.size})`}
                    </button>
                )}
                {fogliFiltrati.length > 0 && (
                    <button
                        onClick={handleCopySelected}
                        disabled={selectedFogli.size === 0 || copyLoading || loadingFogli}
                        className="button secondary"
                    >
                        {copyLoading ? `Copia... (${selectedFogli.size})` : `Copia Selezionati (${selectedFogli.size})`}
                    </button>
                )}
                {fogliFiltrati.length > 0 && (
                    <button
                        onClick={handleExportSelected}
                        disabled={selectedFogli.size === 0 || exportLoading || loadingFogli}
                        className="button secondary"
                    >
                        {exportLoading ? `Esporta... (${selectedFogli.size})` : `Esporta XLSX (${selectedFogli.size})`}
                    </button>
                )}
                {fogliFiltrati.length > 0 && (
                    <button
                        onClick={handleViewCalendar}
                        disabled={selectedFogli.size === 0 || loadingFogli}
                        className="button primary"
                    >
                        Visualizza su Calendario ({selectedFogli.size})
                    </button>
                )}
            </div>
            
            {loadingFogli && fogliFiltrati.length > 0 && <p>Aggiornamento risultati in corso...</p>}

            {fogliFiltrati.length === 0 && !loadingFogli ? (
                <p>Nessun foglio di assistenza trovato con i filtri applicati.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th> 
                                <input 
                                    type="checkbox" 
                                    onChange={handleSelectAllFogli} 
                                    checked={fogliFiltrati.length > 0 && selectedFogli.size === fogliFiltrati.length} 
                                    disabled={fogliFiltrati.length === 0 || loadingFogli} 
                                    title="Seleziona/Deseleziona tutti i risultati visualizzati"
                                /> 
                            </th>
                            <th>Azioni</th>
                            <th onClick={() => handleSort('numero_foglio')} style={{cursor:'pointer'}}>
                                N. Foglio {sortConfig.column === 'numero_foglio' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('data_apertura_foglio')} style={{cursor:'pointer'}}>
                                Data Apertura {sortConfig.column === 'data_apertura_foglio' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('cliente_nome_azienda')} style={{cursor:'pointer'}}>
                                Cliente {sortConfig.column === 'cliente_nome_azienda' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th>Tecnico Assegnato</th>
                            <th>Tecnici Coinvolti</th>
                            <th onClick={() => handleSort('commessa_codice')} style={{cursor:'pointer'}}>
                                Commessa {sortConfig.column === 'commessa_codice' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('ordine_numero')} style={{cursor:'pointer'}}>
                                Ordine Cl. {sortConfig.column === 'ordine_numero' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th>Motivo Intervento</th>
                            <th>Stato</th>
                            <th onClick={() => handleSort('ultima_data_stampa')} style={{cursor:'pointer'}}>
                                Ultima Stampa {sortConfig.column === 'ultima_data_stampa' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th>Da Stampare</th>
                            {(userRole === 'admin' || userRole === 'manager') && (
                                <th>Pianificato</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedFogli.map((foglio) => (
                            <tr key={foglio.id} className={selectedFogli.has(foglio.id) ? 'selected-row' : ''}>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedFogli.has(foglio.id)}
                                        onChange={() => handleSelectFoglio(foglio.id)}
                                    />
                                </td>
                                <td className="actions">
                                    <Link to={`/fogli-assistenza/${foglio.id}`} className="button small">Dettaglio</Link>
                                </td>
                                <td>{foglio.numero_foglio || `ID: ${foglio.id.substring(0,8)}`}</td>
                                <td>{new Date(foglio.data_apertura_foglio).toLocaleDateString()}</td>
                                <td>{foglio.cliente_nome_azienda}</td>
                                <td>{foglio.tecnico_assegnato_nome}</td>
                                <td style={{fontSize:'0.9em', maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={foglio.nomi_tecnici_coinvolti}>
                                    {foglio.nomi_tecnici_coinvolti}
                                </td>
                                <td>{foglio.commessa_codice}</td>
                                <td>{foglio.ordine_numero}</td>
                                <td style={{maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={foglio.motivo_intervento_generale}>
                                    {foglio.motivo_intervento_generale}
                                </td>
                                <td><span className={`status-badge status-${foglio.stato_foglio?.toLowerCase().replace(/\s+/g, '-')}`}>{foglio.stato_foglio}</span></td>
                                <td style={{ textAlign: 'center' }}>
                                    {foglio.ultima_data_stampa
                                        ? new Date(foglio.ultima_data_stampa).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : '-'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {foglio.richiesta_nuova_stampa ? (
                                        <span
                                            style={{
                                                backgroundColor: '#dc3545',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.85em',
                                                fontWeight: 'bold',
                                            }}
                                            title="Foglio modificato dopo l'ultima stampa"
                                        >
                                            Da stampare
                                        </span>
                                    ) : (
                                        <span style={{ color: '#28a745' }}>✓</span>
                                    )}
                                </td>
                                {(userRole === 'admin' || userRole === 'manager') && (
                                    <td style={{ textAlign: 'center' }}>
                                        {pianificazioniMap[foglio.id] ? (
                                            <span
                                                style={{
                                                    backgroundColor: '#007bff',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.85em',
                                                    fontWeight: 'bold',
                                                }}
                                                title={`${pianificazioniMap[foglio.id]} pianificazioni attive`}
                                            >
                                                📅 {pianificazioniMap[foglio.id]}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#999', fontSize: '0.85em' }}>-</span>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Modal Preview PDF */}
            {showPreview && previewPdfUrl && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px',
                        gap: '10px'
                    }}>
                        <h2 style={{ margin: 0, color: '#fff' }}>Preview PDF</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    const printWindow = window.open(previewPdfUrl);
                                    if (printWindow) printWindow.print();
                                }}
                                className="button primary"
                            >
                                Stampa
                            </button>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setPreviewPdfUrl(null);
                                }}
                                className="button secondary"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                    <iframe
                        src={previewPdfUrl}
                        style={{
                            flex: 1,
                            border: 'none',
                            backgroundColor: '#fff',
                            borderRadius: '4px'
                        }}
                        title="PDF Preview"
                    />
                </div>
            )}
        </div>
    );
}

export default FogliAssistenzaListPage;