// src/components/Anagrafiche/TecniciManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

function TecniciManager({ session }) {
    const [tecnici, setTecnici] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [formNome, setFormNome] = useState('');
    const [formCognome, setFormCognome] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [editingTecnico, setEditingTecnico] = useState(null);

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';
    const fileInputRef = useRef(null);

    const fetchTecnici = async () => {
        setPageLoading(true); 
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('tecnici')
            .select('*')
            .order('cognome')
            .order('nome');
        if (fetchError) { 
            setError(fetchError.message); 
            console.error('Errore fetch tecnici:', fetchError); 
        } else { 
            setTecnici(data || []); 
        }
        setPageLoading(false);
    };

    useEffect(() => {
        if (session && canManage) { 
            fetchTecnici(); 
        } else { 
            setTecnici([]); 
            setPageLoading(false); 
        }
    }, [session, canManage]);

    const resetForm = () => { 
        setFormNome(''); 
        setFormCognome(''); 
        setFormEmail(''); 
        setEditingTecnico(null); 
    };
    
    const handleEditTecnico = (tecnico) => {
        if (!canManage) { 
            alert("Non hai i permessi per modificare tecnici."); 
            return; 
        }
        setEditingTecnico(tecnico); 
        setFormNome(tecnico.nome); 
        setFormCognome(tecnico.cognome); 
        setFormEmail(tecnico.email || '');
        window.scrollTo(0, 0);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) { 
            alert("Non hai i permessi per questa operazione."); 
            return; 
        }
        if (!formNome.trim() || !formCognome.trim()) { 
            alert("Nome e cognome sono obbligatori."); 
            return; 
        }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const tecnicoData = { 
            nome: formNome.trim(), 
            cognome: formCognome.trim(), 
            email: formEmail.trim() || null 
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
            await fetchTecnici(); 
            setSuccessMessage(editingTecnico ? 'Tecnico modificato con successo!' : 'Tecnico aggiunto con successo!'); 
            setTimeout(()=> setSuccessMessage(''), 3000); 
        }
        setLoadingActions(false);
    };

    const handleDeleteTecnico = async (tecnicoId) => {
        if (!canManage) { 
            alert("Non hai i permessi per eliminare tecnici."); 
            return; 
        }
        if (window.confirm("Sei sicuro di voler eliminare questo tecnico? Questa azione potrebbe influire sugli interventi di assistenza associati.")) {
            setLoadingActions(true); setError(null); setSuccessMessage('');
            const { error: delError } = await supabase.from('tecnici').delete().eq('id', tecnicoId);
            if (delError) { 
                setError(delError.message); 
                alert("Eliminazione fallita: " + delError.message); 
            } else { 
                await fetchTecnici(); 
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
            id: t.id, 
            nome: t.nome, 
            cognome: t.cognome, 
            email: t.email || '', 
            created_at: t.created_at,
            user_id: t.user_id || '' 
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
                    const values = headers.map(h => `"${(('' + (row[h] === null || typeof row[h] === 'undefined' ? '' : row[h])).replace(/"/g, '""'))}"`); 
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

    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const fileContent = e.target.result; 
                let parsedData = [];
                if (file.name.endsWith('.csv')) {
                    const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
                    if (result.errors.length > 0) {
                        throw new Error("Errore parsing CSV: " + result.errors.map(err => err.message).join(", "));
                    }
                    parsedData = result.data;
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(fileContent, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 , raw: false, dateNF: 'yyyy-mm-dd'});
                    if (parsedData.length > 0) {
                        const headersXlsx = parsedData[0];
                        parsedData = parsedData.slice(1).map(rowArray => {
                            const rowObject = {};
                            headersXlsx.forEach((header, index) => {
                                rowObject[header] = rowArray[index];
                            });
                            return rowObject;
                        });
                    }
                } else {
                    throw new Error("Formato file non supportato. Usare .csv o .xlsx");
                }
                
                const datiDaUpsert = parsedData.map(row => {
                    const tecnico = {};
                    if (row.hasOwnProperty('nome')) tecnico.nome = row.nome?.trim();
                    if (row.hasOwnProperty('cognome')) tecnico.cognome = row.cognome?.trim();
                    if (row.hasOwnProperty('email')) tecnico.email = row.email?.trim() || null;
                    // if (row.hasOwnProperty('user_id')) tecnico.user_id = row.user_id?.trim() || null; 
                    return tecnico;
                }).filter(item => item.nome && item.cognome);

                if (datiDaUpsert.length === 0) {
                    setError("Nessun dato valido da importare (richiesti: nome, cognome).");
                    setLoadingActions(false); if(fileInputRef.current) fileInputRef.current.value = ""; return;
                }
                console.log("Dati pronti per upsert (Tecnici):", datiDaUpsert);
                const { data, error: upsertError } = await supabase.from('tecnici')
                    .upsert(datiDaUpsert, { onConflict: 'nome,cognome' })
                    .select();
                if (upsertError) { 
                    setError("Importazione/Aggiornamento fallito: " + upsertError.message); 
                    console.error("Errore upsert tecnici:", upsertError);
                } else { 
                    setSuccessMessage(`${data ? data.length : 0} tecnici importati/aggiornati!`); 
                    await fetchTecnici(); 
                    setTimeout(()=> setSuccessMessage(''), 5000);
                }
            } catch (parseError) { 
                setError("Errore durante l'elaborazione del file: " + parseError.message); 
                console.error("Errore elaborazione file (tecnici):", parseError);
            } finally { 
                setLoadingActions(false); 
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
    const triggerFileInput = () => fileInputRef.current?.click();

    if (pageLoading) return <p>Caricamento anagrafica tecnici...</p>;
    if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    if (!session && !pageLoading) return <Navigate to="/login" replace />;

    return (
        <div>
            <h2>Anagrafica Tecnici Oilsafe</h2>
            {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap' }}>
                    <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelected} style={{ display: 'none' }} ref={fileInputRef} />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}> 
                        {loadingActions ? 'Attendere...' : 'Importa/Aggiorna Tecnici'} 
                    </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || tecnici.length === 0}> 
                            Esporta CSV 
                        </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || tecnici.length === 0}> 
                            Esporta XLSX 
                        </button>
                    </div>
                </div>
            )}
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingTecnico ? 'Modifica Tecnico' : 'Nuovo Tecnico'}</h3>
                    <div> 
                        <label htmlFor="formNomeTecnico">Nome:</label> 
                        <input type="text" id="formNomeTecnico" value={formNome} onChange={e => setFormNome(e.target.value)} required /> 
                    </div>
                    <div> 
                        <label htmlFor="formCognomeTecnico">Cognome:</label> 
                        <input type="text" id="formCognomeTecnico" value={formCognome} onChange={e => setFormCognome(e.target.value)} required /> 
                    </div>
                    <div> 
                        <label htmlFor="formEmailTecnico">Email (Opzionale):</label> 
                        <input type="email" id="formEmailTecnico" value={formEmail} onChange={e => setFormEmail(e.target.value)} /> 
                    </div>
                    <button type="submit" disabled={loadingActions}>{loadingActions ? 'Salvataggio...' : (editingTecnico ? 'Salva Modifiche' : 'Aggiungi Tecnico')}</button>
                    {editingTecnico && ( 
                        <button type="button" className="secondary" onClick={resetForm} disabled={loadingActions} style={{marginLeft:'10px'}}> 
                            Annulla Modifica 
                        </button> 
                    )}
                </form>
            )}
            <h3>Elenco Tecnici</h3>
            {tecnici.length === 0 && !pageLoading ? ( <p>Nessun tecnico trovato.</p> ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Cognome</th>
                            <th>Nome</th>
                            <th>Email</th>
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {tecnici.map(tecnico => (
                            <tr key={tecnico.id} style={editingTecnico && editingTecnico.id === tecnico.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{tecnico.cognome}</td>
                                <td>{tecnico.nome}</td>
                                <td>{tecnico.email || '-'}</td>
                                 {canManage && (
                                    <td className="actions">
                                        <button className="button secondary small" onClick={() => handleEditTecnico(tecnico)} disabled={loadingActions}>Modifica</button>
                                        <button className="button danger small" onClick={() => handleDeleteTecnico(tecnico.id)} disabled={loadingActions} style={{marginLeft:'5px'}}>Elimina</button>
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
export default TecniciManager;