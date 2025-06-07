// src/pages/DashboardPage.jsx
import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Assicurati che questo import sia qui

// Funzione di test
const runPdfAutoTableTest = () => {
    console.log("Avvio test jsPDF AutoTable...");
    try {
        const docTest = new jsPDF();

        // Verifica se autoTable è stato aggiunto all'istanza di jsPDF
        console.log("Verifica di docTest.autoTable:", docTest.autoTable);
        console.log("Tipo di docTest.autoTable:", typeof docTest.autoTable);

        if (typeof docTest.autoTable === 'function') {
            console.log("docTest.autoTable è una funzione. Procedo con la generazione della tabella.");

            // Dati di esempio per la tabella
            const head = [['ID', 'Nome', 'Email']];
            const body = [
                [1, 'Mario Rossi', 'mario.rossi@example.com'],
                [2, 'Luigi Verdi', 'luigi.verdi@example.com'],
                [3, 'Anna Bianchi', 'anna.bianchi@example.com'],
            ];

            docTest.autoTable({
                head: head,
                body: body,
                startY: 20, // Posizione Y di inizio tabella
                didDrawPage: function (data) {
                    // Puoi aggiungere intestazioni/piè di pagina qui se la tabella va su più pagine
                    console.log("Tabella disegnata sulla pagina:", data.pageNumber);
                }
            });

            docTest.save('test_autotable.pdf');
            console.log("PDF di test 'test_autotable.pdf' dovrebbe essere stato generato/scaricato.");
            alert("Test PDF AutoTable eseguito. Controlla la console e i download del browser.");

        } else {
            console.error("ERRORE CRITICO: docTest.autoTable NON è una funzione. Il plugin non è caricato.");
            alert("ERRORE: docTest.autoTable non è una funzione. Controlla la console per dettagli. Il plugin jspdf-autotable potrebbe non essere caricato correttamente.");
        }
    } catch (error) {
        console.error("Errore durante l'esecuzione del test AutoTable:", error);
        alert("Si è verificato un errore durante il test. Controlla la console.");
    }
};


function DashboardPage({ session }) { // Assumendo che riceva la sessione
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Benvenuto in Oilsafe Service Hub!</p>
      {session && <p>Loggato come: {session.user.full_name || session.user.email} (Ruolo: {session.user.role})</p>}
      
      <hr style={{margin: "20px 0"}} />
      <h3>Test Funzionalità PDF AutoTable</h3>
      <button onClick={runPdfAutoTableTest} className="button primary">
        Esegui Test PDF AutoTable
      </button>
      <p><small>Questo test creerà un semplice PDF con una tabella usando jsPDF e jsPDF-AutoTable per verificare se il plugin è caricato correttamente. Controlla la console del browser per i log.</small></p>
    </div>
  );
}
export default DashboardPage;