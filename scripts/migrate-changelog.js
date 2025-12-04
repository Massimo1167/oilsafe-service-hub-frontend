import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Inizio migrazione changelog...\n');

// Leggi package.json
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldDescription = pkg.description;

console.log(`📖 Lettura description da package.json (${oldDescription.length} caratteri)`);

// Parse description: "v1.1.7e - 04/12/2025: Descrizione;"
const versionEntries = oldDescription.split(';').map(entry => {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/v([\d.a-z]+)\s*-\s*([\d/]+):\s*(.+)/i);
  if (!match) {
    console.warn(`⚠️  Impossibile parsare entry: "${trimmed.substring(0, 50)}..."`);
    return null;
  }

  const [, version, date, description] = match;

  // Converti data da DD/MM/YYYY a YYYY-MM-DD
  const [day, month, year] = date.split('/');
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // Categorizza automaticamente basandosi su parole chiave
  const descLower = description.toLowerCase();
  let category = 'Changed'; // Default

  if (descLower.includes('aggiunt') || descLower.includes('nuov')) {
    category = 'Added';
  } else if (descLower.includes('fix') || descLower.includes('risolto') || descLower.includes('correzion')) {
    category = 'Fixed';
  } else if (descLower.includes('rimoss') || descLower.includes('tolto') || descLower.includes('eliminat')) {
    category = 'Removed';
  } else if (descLower.includes('modific') || descLower.includes('ottimizzazion') || descLower.includes('potenziament')) {
    category = 'Changed';
  }

  return { version, date: isoDate, description: description.trim(), category };
}).filter(Boolean);

console.log(`✅ Parsate ${versionEntries.length} versioni\n`);

// Genera CHANGELOG.md
let changelog = `# Changelog

Tutte le modifiche significative al progetto sono documentate in questo file.

Il formato si basa su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e questo progetto aderisce al [Semantic Versioning](https://semver.org/lang/it/).

`;

versionEntries.forEach(({ version, date, description, category }) => {
  changelog += `## [${version}] - ${date}\n\n`;
  changelog += `### ${category}\n`;
  changelog += `- ${description}\n\n`;
});

// Scrivi CHANGELOG.md
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
fs.writeFileSync(changelogPath, changelog, 'utf8');

console.log(`✅ CHANGELOG.md creato con successo!`);
console.log(`📁 Path: ${changelogPath}`);
console.log(`📊 Versioni migrate: ${versionEntries.length}`);
console.log(`\n✨ Migrazione completata! Ora puoi eseguire gli altri step del piano.`);
