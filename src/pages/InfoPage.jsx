import React, { useState, useEffect } from 'react';
import './InfoPage.css';
import oilsafeLogo from '../assets/oilsafe-logo.png';

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
        {/* eslint-disable-next-line no-undef */}
        <p className="info-subtitle">
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
          {/* eslint-disable-next-line no-undef */}
          <p className="info-value">{__APP_VERSION__}</p>
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
 * Tab Documentazione: Placeholder per documentazione futura
 */
function DocsTab() {
  return (
    <div className="docs-container">
      <h2>Documentazione</h2>

      <div className="placeholder-content">
        <div className="placeholder-icon">📚</div>
        <h3>Documentazione in Arrivo</h3>
        <p>
          Questa sezione conterrà guide utente, tutorial e documentazione tecnica
        </p>

        <div className="placeholder-sections">
          <div className="placeholder-item">
            <h4>📖 Guide Utente</h4>
            <p>Manuali per l'utilizzo delle funzionalità principali</p>
          </div>
          <div className="placeholder-item">
            <h4>🎓 Tutorial</h4>
            <p>Istruzioni passo-passo per operazioni comuni</p>
          </div>
          <div className="placeholder-item">
            <h4>🔧 Documentazione Tecnica</h4>
            <p>Specifiche tecniche e architettura del sistema</p>
          </div>
        </div>
      </div>
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
