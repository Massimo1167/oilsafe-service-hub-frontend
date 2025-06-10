// src/pages/FogliAssistenzaListPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { generateFoglioAssistenzaPDF } from '../utils/pdfGenerator';

function FogliAssistenzaListPage({ session, loadingAnagrafiche, clienti: allClienti, tecnici: allTecnici, commesse: allCommesse, ordini: allOrdini }) {
    const [fogliRaw, setFogliRaw] = useState([]);
    const [loadingFogli, setLoadingFogli] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFogli, setSelectedFogli] = useState(new Set());
    const [stampaLoading, setStampaLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [filtroDataDa, setFiltroDataDa] = useState('');
    const [filtroDataA, setFiltroDataA] = useState('');
    const [filtroClienteTesto, setFiltroClienteTesto] = useState('');
    const [filtroTecnicoTesto, setFiltroTecnicoTesto] = useState('');
    const [filtroCommessaTesto, setFiltroCommessaTesto] = useState('');
    const [filtroOrdineTesto, setFiltroOrdineTesto] = useState('');
    
    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;

    const fetchFogliDaServer = useCallback(async () => {
        if (!session || loadingAnagrafiche) {
            if (loadingAnagrafiche) setLoadingFogli(true);
            return;
        }

        setLoadingFogli(true);
        setError(null);

        let query = supabase
            .from('fogli_assistenza')
            .select(`
                id, numero_foglio, data_apertura_foglio, stato_foglio, creato_da_user_id,
                cliente_id, commessa_id, ordine_cliente_id,
                interventi_assistenza!left(tecnico_id)
            `)
            .order('data_apertura_foglio', { ascending: false });

        if (userRole === 'user') query = query.eq('creato_da_user_id', currentUserId);
        if (filtroDataDa) query = query.gte('data_apertura_foglio', filtroDataDa);
        if (filtroDataA) {
            const dataAEndDate = new Date(filtroDataA);
            dataAEndDate.setDate(dataAEndDate.getDate() + 1);
            query = query.lt('data_apertura_foglio', dataAEndDate.toISOString().split('T')[0]);
        }
        
        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Errore fetch fogli da server:', fetchError);
            setError(fetchError.message);
            setFogliRaw([]);
        } else {
            setFogliRaw(data || []);
        }
        setLoadingFogli(false);
    }, [session, loadingAnagrafiche, userRole, currentUserId, filtroDataDa, filtroDataA]); 

    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            fetchFogliDaServer(); 
        }, 300);
        return () => clearTimeout(debounceTimeout);
    }, [fetchFogliDaServer]);

    const fogliFiltrati = useMemo(() => {
        if (loadingAnagrafiche || !Array.isArray(allClienti) || !Array.isArray(allTecnici) || !Array.isArray(allCommesse) || !Array.isArray(allOrdini)) {
            return [];
        }

        const processedFogli = (fogliRaw || []).map(foglio => {
            const cliente = allClienti.find(c => c.id === foglio.cliente_id);
            const commessa = allCommesse.find(c => c.id === foglio.commessa_id);
            const ordine = allOrdini.find(o => o.id === foglio.ordine_cliente_id);
            
            const tecniciNomiSet = new Set();
            if (foglio.interventi_assistenza && Array.isArray(foglio.interventi_assistenza)) {
                foglio.interventi_assistenza.forEach(intervento => {
                    if (intervento?.tecnico_id) {
                        const tecnicoTrovato = allTecnici.find(t => t.id === intervento.tecnico_id);
                        if (tecnicoTrovato) tecniciNomiSet.add(`${tecnicoTrovato.nome} ${tecnicoTrovato.cognome}`);
                    }
                });
            }
            return {
                ...foglio,
                cliente_nome_azienda: cliente?.nome_azienda || 'N/D',
                commessa_codice: commessa?.codice_commessa || '-',
                ordine_numero: ordine?.numero_ordine_cliente || '-',
                nomi_tecnici_coinvolti: Array.from(tecniciNomiSet).join(', ') || 'Nessuno',
            };
        });

        let dataDaFiltrare = processedFogli;
        if (filtroClienteTesto.trim()) { dataDaFiltrare = dataDaFiltrare.filter(f => f.cliente_nome_azienda.toLowerCase().includes(filtroClienteTesto.toLowerCase())); }
        if (filtroCommessaTesto.trim()) { dataDaFiltrare = dataDaFiltrare.filter(f => f.commessa_codice.toLowerCase().includes(filtroCommessaTesto.toLowerCase())); }
        if (filtroOrdineTesto.trim()) { dataDaFiltrare = dataDaFiltrare.filter(f => f.ordine_numero.toLowerCase().includes(filtroOrdineTesto.toLowerCase())); }
        if (filtroTecnicoTesto.trim()) { dataDaFiltrare = dataDaFiltrare.filter(f => f.nomi_tecnici_coinvolti.toLowerCase().includes(filtroTecnicoTesto.toLowerCase())); }
        
        return dataDaFiltrare;

    }, [fogliRaw, loadingAnagrafiche, allClienti, allTecnici, allCommesse, allOrdini, filtroClienteTesto, filtroCommessaTesto, filtroOrdineTesto, filtroTecnicoTesto]);


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

    const handlePrintSelected = async () => { 
        if (selectedFogli.size === 0) { alert("Seleziona almeno un foglio."); return; }
        setStampaLoading(true); setError(null); setSuccessMessage('');
        let printErrors = [];
        for (const foglioId of Array.from(selectedFogli)) { 
            try {
                const { data: foglioData, error: foglioError } = await supabase.from('fogli_assistenza').select(`*, clienti (*), commesse (*), ordini_cliente (*), indirizzi_clienti!indirizzo_intervento_id (*)`).eq('id', foglioId).single();
                if (foglioError || !foglioData) throw new Error(foglioError?.message || `Foglio ${foglioId} non trovato.`);
                
                const { data: interventiData, error: interventiError } = await supabase.from('interventi_assistenza').select(`*, tecnici (*)`) .eq('foglio_assistenza_id', foglioId).order('data_intervento_effettivo');
                if (interventiError) console.warn(`Attenzione: Errore nel recuperare gli interventi per il foglio ${foglioId}: ${interventiError.message}`);
                
                await generateFoglioAssistenzaPDF(foglioData, interventiData || []);
            } catch (err) { 
                console.error(`Errore durante la generazione del PDF per il foglio ${foglioId}:`, err); 
                printErrors.push(`Foglio ${foglioId.substring(0,8)}: ${err.message}`);
            }
        }
        if (printErrors.length > 0) {
            setError(`Si sono verificati errori durante la stampa:\n${printErrors.join('\n')}`);
        } else {
            setSuccessMessage(`Operazione di stampa PDF completata per ${selectedFogli.size} fogli.`);
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        setStampaLoading(false); 
        setSelectedFogli(new Set()); 
    };

    const resetAllFilters = () => {
        setFiltroDataDa(''); setFiltroDataA('');
        setFiltroClienteTesto(''); setFiltroTecnicoTesto('');
        setFiltroCommessaTesto(''); setFiltroOrdineTesto('');
    };

    const isLoading = loadingAnagrafiche || loadingFogli;

    if (!session) return <Navigate to="/login" replace />;

    return (
        <div>
            <h2>Elenco Fogli di Assistenza</h2>
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold', whiteSpace:'pre-wrap' }}>ERRORE: {error}</p>}

            <div className="filtri-container">
                <h4>Filtri di Ricerca</h4>
                <div className="filtri-grid">
                    <div> <label htmlFor="filtroDataDa">Da Data Apertura:</label> <input type="date" id="filtroDataDa" value={filtroDataDa} onChange={e => setFiltroDataDa(e.target.value)} /> </div>
                    <div> <label htmlFor="filtroDataA">A Data Apertura:</label> <input type="date" id="filtroDataA" value={filtroDataA} onChange={e => setFiltroDataA(e.target.value)} /> </div>
                    <div> <label htmlFor="filtroClienteTesto">Cliente:</label> <input type="text" id="filtroClienteTesto" placeholder="Cerca nome cliente..." value={filtroClienteTesto} onChange={e => setFiltroClienteTesto(e.target.value)} /> </div>
                    <div> <label htmlFor="filtroTecnicoTesto">Tecnico Coinvolto:</label> <input type="text" id="filtroTecnicoTesto" placeholder="Cerca nome tecnico..." value={filtroTecnicoTesto} onChange={e => setFiltroTecnicoTesto(e.target.value)} /> </div>
                    <div> <label htmlFor="filtroCommessaTesto">Commessa:</label> <input type="text" id="filtroCommessaTesto" placeholder="Cerca codice commessa..." value={filtroCommessaTesto} onChange={e => setFiltroCommessaTesto(e.target.value)} /> </div>
                    <div> <label htmlFor="filtroOrdineTesto">Ordine Cliente:</label> <input type="text" id="filtroOrdineTesto" placeholder="Cerca numero ordine..." value={filtroOrdineTesto} onChange={e => setFiltroOrdineTesto(e.target.value)} /> </div>
                </div>
                <button onClick={resetAllFilters} className="button secondary" style={{marginTop:'10px'}} disabled={isLoading || stampaLoading}>Azzera Filtri</button>
            </div>
            
            <div className="azioni-gruppo" style={{ margin: '20px 0', display: 'flex', gap: '10px', alignItems: 'center' }}>
                {(userRole === 'admin' || userRole === 'user') && (
                    <Link to="/fogli-assistenza/nuovo" className="button">
                        Nuovo Foglio Assistenza
                    </Link>
                )}
                
                {fogliFiltrati.length > 0 && (
                    <button 
                        onClick={handlePrintSelected} 
                        disabled={selectedFogli.size === 0 || stampaLoading || isLoading}
                        className="button primary"
                    >
                        {stampaLoading ? `Stampa... (${selectedFogli.size})` : `Stampa Selezionati (${selectedFogli.size})`}
                    </button>
                )}
            </div>
            
            {isLoading ? <p>Caricamento fogli di assistenza...</p> : 
            (
                <>
                    {fogliFiltrati.length === 0 ? (
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
                                            disabled={fogliFiltrati.length === 0 || isLoading} 
                                            title="Seleziona/Deseleziona tutti i risultati visualizzati"
                                        /> 
                                    </th>
                                    <th>N. Foglio</th>
                                    <th>Data Apertura</th>
                                    <th>Cliente</th>
                                    <th>Tecnici Coinvolti</th>
                                    <th>Commessa</th>
                                    <th>Ordine Cl.</th>
                                    <th>Stato</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fogliFiltrati.map((foglio) => (
                                    <tr key={foglio.id} className={selectedFogli.has(foglio.id) ? 'selected-row' : ''}>
                                        <td> <input type="checkbox" checked={selectedFogli.has(foglio.id)} onChange={() => handleSelectFoglio(foglio.id)} /> </td>
                                        <td>{foglio.numero_foglio || `ID: ${foglio.id.substring(0,8)}`}</td>
                                        <td>{new Date(foglio.data_apertura_foglio).toLocaleDateString()}</td>
                                        <td>{foglio.cliente_nome_azienda}</td>
                                        <td style={{fontSize:'0.9em', maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={foglio.nomi_tecnici_coinvolti}>
                                            {foglio.nomi_tecnici_coinvolti}
                                        </td>
                                        <td>{foglio.commessa_codice}</td>
                                        <td>{foglio.ordine_numero}</td>
                                        <td><span className={`status-badge status-${foglio.stato_foglio?.toLowerCase().replace(/\s+/g, '-')}`}>{foglio.stato_foglio}</span></td>
                                        <td className="actions"> <Link to={`/fogli-assistenza/${foglio.id}`} className="button small">Dettaglio</Link> </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </div>
    );
}

export default FogliAssistenzaListPage;