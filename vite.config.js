import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import pkg from './package.json' with { type: 'json' };

/**
 * Legge CHANGELOG.md e restituisce la prima change della versione corrente
 * Se CHANGELOG.md non esiste o non è parsabile, torna a pkg.description
 */
function getCurrentVersionFromChangelog() {
  try {
    const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');

    if (!fs.existsSync(changelogPath)) {
      console.warn('⚠️  CHANGELOG.md non trovato, uso description da package.json');
      return pkg.description;
    }

    const content = fs.readFileSync(changelogPath, 'utf8');
    const lines = content.split('\n');

    for (let line of lines) {
      // Match: ## [1.1.7e] - 2025-12-04
      const match = line.match(/^##\s+\[([^\]]+)\]\s+-\s+(\d{4}-\d{2}-\d{2})/);
      if (match) {
        // Trova la prima change (linea con "- ")
        const versionLineIndex = lines.indexOf(line);
        const changes = [];

        for (let i = versionLineIndex + 1; i < lines.length; i++) {
          // Stop se arriviamo alla prossima versione
          if (lines[i].match(/^##\s+\[/)) break;

          // Trova items: - Descrizione
          const itemMatch = lines[i].match(/^-\s+(.+)/);
          if (itemMatch) {
            changes.push(itemMatch[1]);
          }
        }

        return changes[0] || pkg.description;
      }
    }

    return pkg.description;
  } catch (error) {
    console.error('❌ Errore lettura CHANGELOG.md:', error);
    return pkg.description;
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_DESCRIPTION__: JSON.stringify(getCurrentVersionFromChangelog()),
  },
  publicDir: 'public'
});
