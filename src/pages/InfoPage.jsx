import React, { useState, useEffect } from 'react';
import './InfoPage.css';
import oilsafeLogo from '../assets/oilsafe-logo.png';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { videoTutorials } from '../data/videoTutorials';
import { faqCategories } from '../data/faqData';

// Configurazione worker per react-pdf (CRITICO: senza questo, il PDF non si carica)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Pagina Informazioni Applicazione
 *
 * Organizzata in 4 tab:
 * - Changelog: Versione corrente + storico versioni
 * - Sistema: DB collegato, versione, ambiente, framework
 * - Credits: Sviluppatore, azienda, tecnologie utilizzate
 * - Documentazione: Placeholder per documentazione futura
 */
function InfoPage() {
  const [activeTab, setActiveTab] = useState('changelog');
  const [changelogData, setChangelogData] = useState([]);
  const [loadingChangelog, setLoadingChangelog] = useState(true);
  // eslint-disable-next-line no-undef
  const [expandedVersions, setExpandedVersions] = useState(new Set([__APP_VERSION__]));

  useEffect(() => {
    // Fetch CHANGELOG.md da public/
    fetch('/CHANGELOG.md')
      .then(res => {
        if (!res.ok) throw new Error('CHANGELOG.md non trovato');
        return res.text();
      })
      .then(text => {
        const parsed = parseChangelog(text);
        setChangelogData(parsed);
        setLoadingChangelog(false);
      })
      .catch(err => {
        console.error('Errore caricamento changelog:', err);
        setLoadingChangelog(false);
      });
  }, []);

  /**
   * Parsing CHANGELOG.md in formato Keep a Changelog
   * Estrae versioni, date e categorie (Added, Changed, Fixed, Removed)
   */
  const parseChangelog = (text) => {
    const lines = text.split('\n');
    const versions = [];
    let currentVersion = null;
    let currentCategory = null;

    for (let line of lines) {
      // Versione: ## [1.1.7e] - 2025-12-04
      const versionMatch = line.match(/^##\s+\[([^\]]+)\]\s+-\s+(\d{4}-\d{2}-\d{2})/);
      if (versionMatch) {
        if (currentVersion) versions.push(currentVersion);
        currentVersion = {
          version: versionMatch[1],
          date: versionMatch[2],
          categories: {}
        };
        currentCategory = null;
        continue;
      }

      // Categoria: ### Added
      const categoryMatch = line.match(/^###\s+(.+)/);
      if (categoryMatch && currentVersion) {
        currentCategory = categoryMatch[1];
        currentVersion.categories[currentCategory] = [];
        continue;
      }

      // Item: - Descrizione
      const itemMatch = line.match(/^-\s+(.+)/);
      if (itemMatch && currentVersion && currentCategory) {
        currentVersion.categories[currentCategory].push(itemMatch[1]);
      }
    }

    if (currentVersion) versions.push(currentVersion);
    return versions;
  };

  const toggleVersion = (version) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(version)) {
      newExpanded.delete(version);
    } else {
      newExpanded.add(version);
    }
    setExpandedVersions(newExpanded);
  };

  return (
    <div className="info-page-container">
      {/* Header */}
      <div className="info-header">
        <img src={oilsafeLogo} alt="Oilsafe Logo" className="info-logo" />
        <h1>Informazioni Applicazione</h1>
        <p className="info-subtitle">
          {/* eslint-disable-next-line no-undef */}
          Oilsafe Service Hub - Versione {__APP_VERSION__}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="info-tabs">
        <button
          className={`info-tab ${activeTab === 'changelog' ? 'active' : ''}`}
          onClick={() => setActiveTab('changelog')}
        >
          📋 Changelog
        </button>
        <button
          className={`info-tab ${activeTab === 'sistema' ? 'active' : ''}`}
          onClick={() => setActiveTab('sistema')}
        >
          ℹ️ Sistema
        </button>
        <button
          className={`info-tab ${activeTab === 'credits' ? 'active' : ''}`}
          onClick={() => setActiveTab('credits')}
        >
          👤 Credits
        </button>
        <button
          className={`info-tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          📖 Documentazione
        </button>
      </div>

      {/* Tab Content */}
      <div className="info-tab-content">
        {activeTab === 'changelog' && (
          <ChangelogTab
            data={changelogData}
            loading={loadingChangelog}
            expanded={expandedVersions}
            onToggle={toggleVersion}
          />
        )}
        {activeTab === 'sistema' && <SistemaTab />}
        {activeTab === 'credits' && <CreditsTab />}
        {activeTab === 'docs' && <DocsTab />}
      </div>
    </div>
  );
}

/**
 * Tab Changelog: Versione corrente + Storico versioni precedenti
 */
function ChangelogTab({ data, loading, expanded, onToggle }) {
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Caricamento changelog...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p>Nessuna versione trovata nel changelog.</p>
      </div>
    );
  }

  const currentVersion = data[0];
  const olderVersions = data.slice(1);

  return (
    <div className="changelog-container">
      {/* Versione Corrente - Sempre Visibile */}
      <div className="current-version">
        <div className="version-header current">
          <h2>Versione Corrente: {currentVersion.version}</h2>
          <span className="version-date">{formatDate(currentVersion.date)}</span>
        </div>
        <div className="version-content">
          {Object.entries(currentVersion.categories).map(([category, items]) => (
            <div key={category} className="category-section">
              <h4 className={`category-title category-${category.toLowerCase()}`}>
                {getCategoryIcon(category)} {category}
              </h4>
              <ul className="change-list">
                {items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Versioni Precedenti - Collapsable */}
      {olderVersions.length > 0 && (
        <div className="older-versions">
          <h3>Versioni Precedenti</h3>
          {olderVersions.map(version => (
            <div key={version.version} className="version-item">
              <button
                className="version-header clickable"
                onClick={() => onToggle(version.version)}
              >
                <span className="version-number">[{version.version}]</span>
                <span className="version-date">{formatDate(version.date)}</span>
                <span className="expand-icon">
                  {expanded.has(version.version) ? '▼' : '▶'}
                </span>
              </button>
              {expanded.has(version.version) && (
                <div className="version-content">
                  {Object.entries(version.categories).map(([category, items]) => (
                    <div key={category} className="category-section">
                      <h4 className={`category-title category-${category.toLowerCase()}`}>
                        {getCategoryIcon(category)} {category}
                      </h4>
                      <ul className="change-list">
                        {items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tab Sistema: Informazioni su DB, ambiente, versione
 */
function SistemaTab() {
  const dbLabel = import.meta.env.VITE_SUPABASE_DB_LABEL;
  const isProduction = dbLabel === 'Oilsafe-Assistenza_main';

  return (
    <div className="sistema-container">
      <h2>Informazioni Sistema</h2>

      <div className="info-grid">
        <div className="info-card">
          <div className="info-card-icon">🗄️</div>
          <h3>Database</h3>
          <p className="info-value">{dbLabel || 'Non configurato'}</p>
          <span className={`env-badge ${isProduction ? 'production' : 'debug'}`}>
            {isProduction ? 'Produzione' : 'Debug'}
          </span>
        </div>

        <div className="info-card">
          <div className="info-card-icon">📦</div>
          <h3>Versione App</h3>
          <p className="info-value">
            {/* eslint-disable-next-line no-undef */}
            {__APP_VERSION__}
          </p>
        </div>

        <div className="info-card">
          <div className="info-card-icon">🌐</div>
          <h3>Ambiente</h3>
          <p className="info-value">{import.meta.env.MODE}</p>
        </div>

        <div className="info-card">
          <div className="info-card-icon">⚛️</div>
          <h3>Framework</h3>
          <p className="info-value">React + Vite</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Credits: Sviluppatore, azienda, tecnologie
 */
function CreditsTab() {
  return (
    <div className="credits-container">
      <h2>Credits</h2>

      <div className="credit-section">
        <div className="credit-icon">👨‍💻</div>
        <h3>Sviluppato da</h3>
        <p className="developer-name">Massimo Centrella</p>
        <p className="developer-role">Full Stack Developer</p>
      </div>

      <div className="credit-section">
        <div className="credit-icon">🏢</div>
        <h3>Azienda</h3>
        <p className="company-name">Oilsafe S.r.l.</p>
        <p className="company-description">
          Soluzioni professionali per la gestione dell'assistenza tecnica
        </p>
      </div>

      <div className="credit-section">
        <div className="credit-icon">📄</div>
        <h3>Licenza</h3>
        <p>© {new Date().getFullYear()} Oilsafe S.r.l. - Tutti i diritti riservati</p>
      </div>

      <div className="credit-section">
        <div className="credit-icon">🛠️</div>
        <h3>Tecnologie Utilizzate</h3>
        <div className="tech-stack">
          <span className="tech-badge">React 19</span>
          <span className="tech-badge">Vite 6</span>
          <span className="tech-badge">Supabase</span>
          <span className="tech-badge">jsPDF</span>
          <span className="tech-badge">React Big Calendar</span>
          <span className="tech-badge">React Router</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Documentazione: Manuale PDF, Video Tutorial, FAQ
 */
function DocsTab() {
  const [activeDocsTab, setActiveDocsTab] = useState('manuale');

  return (
    <div className="docs-container">
      <h2>Documentazione</h2>

      {/* Sub-tab Navigation */}
      <div className="docs-subtabs">
        <button
          className={`docs-subtab ${activeDocsTab === 'manuale' ? 'active' : ''}`}
          onClick={() => setActiveDocsTab('manuale')}
        >
          📖 Manuale Utente
        </button>
        <button
          className={`docs-subtab ${activeDocsTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveDocsTab('video')}
        >
          🎥 Video Tutorial
        </button>
        <button
          className={`docs-subtab ${activeDocsTab === 'faq' ? 'active' : ''}`}
          onClick={() => setActiveDocsTab('faq')}
        >
          ❓ FAQ
        </button>
      </div>

      {/* Sub-tab Content */}
      {activeDocsTab === 'manuale' && <ManualeSubTab />}
      {activeDocsTab === 'video' && <VideoSubTab />}
      {activeDocsTab === 'faq' && <FAQSubTab />}
    </div>
  );
}

/**
 * Sub-Tab: Manuale PDF con viewer interattivo
 */
function ManualeSubTab() {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('Errore caricamento PDF:', error);
    setLoading(false);
    setError('Impossibile caricare il manuale. Il file potrebbe non essere disponibile.');
  };

  return (
    <div className="manuale-container">
      <p className="manuale-intro">
        Consulta il manuale utente completo per scoprire tutte le funzionalità dell'applicazione.
      </p>

      {/* Controlli PDF */}
      <div className="pdf-controls">
        <div className="pdf-controls-group">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            disabled={loading}
            title="Riduci zoom"
          >
            🔍−
          </button>
          <span className="pdf-zoom-label">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
            disabled={loading}
            title="Aumenta zoom"
          >
            🔍+
          </button>
        </div>

        <div className="pdf-controls-group">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber === 1 || loading}
            title="Pagina precedente"
          >
            ←
          </button>
          <span className="pdf-page-label">
            Pagina {pageNumber} di {numPages || '?'}
          </span>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber === numPages || loading}
            title="Pagina successiva"
          >
            →
          </button>
        </div>

        <a
          href="/docs/manuale-utente.pdf"
          download="Oilsafe_Manuale_Utente.pdf"
          className="pdf-download-btn"
          title="Scarica PDF"
        >
          📥 Scarica PDF
        </a>
      </div>

      {/* Viewer PDF */}
      <div className="pdf-viewer-container">
        {error ? (
          <div className="pdf-error">
            <div className="error-icon">⚠️</div>
            <h3>Manuale non disponibile</h3>
            <p>{error}</p>
            <p className="error-hint">
              Il manuale sarà disponibile a breve. Nel frattempo, puoi consultare le FAQ o guardare i video tutorial.
            </p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Caricamento manuale...</p>
              </div>
            )}
            <Document
              file="/docs/manuale-utente.pdf"
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="spinner"></div>}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Sub-Tab: Video Tutorial YouTube
 */
function VideoSubTab() {
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Vista player (quando un video è selezionato)
  if (selectedVideo) {
    return (
      <div className="video-player-container">
        <button
          className="back-to-grid-btn"
          onClick={() => setSelectedVideo(null)}
        >
          ← Torna ai video
        </button>
        <h3>{selectedVideo.title}</h3>
        <div className="video-embed-wrapper">
          <iframe
            width="100%"
            height="500"
            src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeId}`}
            title={selectedVideo.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <p className="video-description">{selectedVideo.description}</p>
        {selectedVideo.category && (
          <span className="video-category-badge">{selectedVideo.category}</span>
        )}
      </div>
    );
  }

  // Vista griglia (default)
  return (
    <div className="video-container">
      <p className="video-intro">
        Guarda i nostri video tutorial per imparare velocemente ad utilizzare l'applicazione.
      </p>

      {videoTutorials.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎥</div>
          <h3>Video Tutorial in Arrivo</h3>
          <p>I video tutorial saranno disponibili a breve.</p>
        </div>
      ) : (
        <div className="video-grid">
          {videoTutorials.map(video => (
            <div
              key={video.id}
              className="video-card"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="video-thumbnail-wrapper">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="video-thumbnail"
                  loading="lazy"
                />
                <div className="video-play-overlay">▶</div>
                {video.duration && (
                  <span className="video-duration-badge">{video.duration}</span>
                )}
              </div>
              <div className="video-info">
                <h4>{video.title}</h4>
                <p>{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Sub-Tab: FAQ (Domande Frequenti)
 */
function FAQSubTab() {
  const [expandedFAQs, setExpandedFAQs] = useState(new Set());

  const toggleFAQ = (faqId) => {
    const newExpanded = new Set(expandedFAQs);
    if (newExpanded.has(faqId)) {
      newExpanded.delete(faqId);
    } else {
      newExpanded.add(faqId);
    }
    setExpandedFAQs(newExpanded);
  };

  return (
    <div className="faq-container">
      <p className="faq-intro">
        Trova rapidamente le risposte alle domande più comuni sull'utilizzo dell'applicazione.
      </p>

      {faqCategories.map(category => (
        <div key={category.category} className="faq-category">
          <h3 className="faq-category-title">
            <span className="faq-category-icon">{category.icon}</span>
            {category.category}
          </h3>

          {category.questions.map(faq => (
            <div key={faq.id} className="faq-item">
              <button
                className="faq-question"
                onClick={() => toggleFAQ(faq.id)}
              >
                <span className="faq-question-text">{faq.question}</span>
                <span className="expand-icon">
                  {expandedFAQs.has(faq.id) ? '▼' : '▶'}
                </span>
              </button>

              {expandedFAQs.has(faq.id) && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                  {faq.relatedVideo && (
                    <button
                      className="related-video-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Switch to video tab and select video
                        alert('Funzionalità in arrivo: collegamento al video tutorial');
                      }}
                    >
                      📹 Guarda il video tutorial correlato
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Helper Functions
function getCategoryIcon(category) {
  const icons = {
    'Added': '✨',
    'Changed': '🔄',
    'Fixed': '🐛',
    'Removed': '🗑️',
    'Security': '🔒'
  };
  return icons[category] || '📝';
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export default InfoPage;
