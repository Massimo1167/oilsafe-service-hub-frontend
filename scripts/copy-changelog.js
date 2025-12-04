import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(__dirname, '../CHANGELOG.md');
const destDir = path.join(__dirname, '../public');
const dest = path.join(destDir, 'CHANGELOG.md');

// Crea la cartella public se non esiste
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log('📁 Cartella public/ creata');
}

// Copia CHANGELOG.md in public/
if (fs.existsSync(source)) {
  fs.copyFileSync(source, dest);
  console.log('✅ CHANGELOG.md copiato in public/');
} else {
  console.warn('⚠️  CHANGELOG.md non trovato nella root del progetto');
}
