#!/usr/bin/env node

/**
 * Codemod determinista para migración de tokens de diseño en React Native.
 *
 * Características:
 * 1. Soporte estricto de modo --dry-run (cero escrituras).
 * 2. Discriminación estricta por propiedad de estilo (backgroundColor, color, fontSize, borderRadius, padding, margin).
 * 3. Detección y marcado para REVISIÓN MANUAL de expresiones complejas (ternarios, condicionales &&, lógica offline).
 * 4. Fusión de imports alfabética y estable sin duplicación de líneas por ruta.
 * 5. Idempotencia: una segunda ejecución produce 0 cambios.
 * 6. Código de salida distinto de cero si ocurren errores de procesamiento.
 */

const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');
const targetArg = process.argv.find(arg => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]);

// ─── Mapas de Reemplazo Seguro (Confianza Alta) ─────────────────────────────
const SAFE_COLOR_MAP = {
  backgroundColor: {
    "'#FFF9F2'": 'colors.background',
    '"#FFF9F2"': 'colors.background',
    "'#FFFFFF'": 'colors.surface',
    '"#FFFFFF"': 'colors.surface',
    "'#F8EDE2'": 'colors.surfaceVariant',
    '"#F8EDE2"': 'colors.surfaceVariant',
    "'#FBF4ED'": 'colors.surfaceSubtle',
    '"#FBF4ED"': 'colors.surfaceSubtle',
    "'#B94E35'": 'colors.primary',
    '"#B94E35"': 'colors.primary',
    "'#863626'": 'colors.primaryDark',
    '"#863626"': 'colors.primaryDark',
    "'#FBE9E2'": 'colors.primaryContainer',
    '"#FBE9E2"': 'colors.primaryContainer',
    "'#EBDDD2'": 'colors.border',
    '"#EBDDD2"': 'colors.border',
  },
  color: {
    "'#2B211D'": 'colors.textPrimary',
    '"#2B211D"': 'colors.textPrimary',
    "'#66534A'": 'colors.textSecondary',
    '"#66534A"': 'colors.textSecondary',
    "'#96857C'": 'colors.textMuted',
    '"#96857C"': 'colors.textMuted',
    "'#FFFFFF'": 'colors.textInverse',
    '"#FFFFFF"': 'colors.textInverse',
    "'#B94E35'": 'colors.primary',
    '"#B94E35"': 'colors.primary',
  },
  borderColor: {
    "'#EBDDD2'": 'colors.border',
    '"#EBDDD2"': 'colors.border',
    "'#D6C4B6'": 'colors.borderStrong',
    '"#D6C4B6"': 'colors.borderStrong',
    "'#B94E35'": 'colors.primary',
    '"#B94E35"': 'colors.primary',
  },
  shadowColor: {
    "'#2B211D'": 'colors.textPrimary',
    '"#2B211D"': 'colors.textPrimary',
    "'#B94E35'": 'colors.primary',
    '"#B94E35"': 'colors.primary',
  },
};

const SAFE_FONT_SIZE_MAP = {
  11: 'typography.sizes.caption',
  12: 'typography.sizes.label',
  13: 'typography.sizes.metadata',
  14: 'typography.sizes.bodySmall',
  15: 'typography.sizes.body',
  16: 'typography.sizes.body',
  17: 'typography.sizes.cardTitle',
  20: 'typography.sizes.sectionTitle',
  21: 'typography.sizes.sectionTitle',
  30: 'typography.sizes.screenTitle',
  32: 'typography.sizes.screenTitle',
};

const SAFE_BORDER_RADIUS_MAP = {
  10: 'radii.chips',
  14: 'radii.buttons',
  16: 'radii.cards',
  22: 'radii.containers',
  32: 'radii.floatingNav',
  999: 'radii.circular',
};

const SAFE_SPACING_MAP = {
  4: 'spacing.xs',
  8: 'spacing.sm',
  12: 'spacing.md',
  16: 'spacing.lg',
  20: 'spacing.xl',
  24: 'spacing.xxl',
  32: 'spacing.xxxl',
  40: 'spacing.section',
};

const SPACING_PROPS = new Set([
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingHorizontal', 'paddingVertical',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'gap', 'rowGap', 'columnGap'
]);

// ─── Reporte y Estadísticas ──────────────────────────────────────────────────
let hasErrors = false;
let totalSafeReplacements = 0;
let totalManualReviews = 0;
const report = [];

function getThemeImportPath(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  if (norm.includes('/src/components/')) {
    return '../theme';
  } else if (norm.includes('/app/')) {
    return '../src/theme';
  }
  return '../theme';
}

function processFile(filePath) {
  const fileReport = {
    filePath,
    safeReplacements: [],
    manualReviews: [],
  };

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`[ERROR] No se pudo leer el archivo: ${filePath}`, err);
    hasErrors = true;
    return;
  }

  const lines = content.split('\n');
  const modifiedLines = [...lines];
  const usedTokens = new Set();
  let fileModified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Ignorar comentarios
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    // 1. Detección de expresiones dinámicas complejas (Ternarios, &&, offline, funciones)
    const isComplex = (
      (line.includes('?') && line.includes(':')) ||
      line.includes('&&') ||
      line.includes('isOffline') ||
      line.includes('=>')
    );

    if (isComplex && (line.includes('#') || /fontSize:\s*\d+/.test(line))) {
      fileReport.manualReviews.push({
        line: lineNum,
        reason: 'Expresión dinámica compleja (ternario/condicional/lógica offline)',
        content: trimmed,
      });
      totalManualReviews++;
      continue;
    }

    let modifiedLine = line;

    // 2. Colores (backgroundColor, color, borderColor, shadowColor)
    for (const [prop, map] of Object.entries(SAFE_COLOR_MAP)) {
      const propRegex = new RegExp(`\\b(${prop})\\s*:\\s*(['"][^'"]+['"])`, 'g');
      let match;
      while ((match = propRegex.exec(line)) !== null) {
        const fullMatch = match[0];
        const val = match[2];
        if (map[val]) {
          const replacementToken = map[val];
          modifiedLine = modifiedLine.replace(fullMatch, `${prop}: ${replacementToken}`);
          usedTokens.add(replacementToken.split('.')[0]);
          fileReport.safeReplacements.push({
            line: lineNum,
            prop,
            from: val,
            to: replacementToken,
          });
          totalSafeReplacements++;
          fileModified = true;
        } else if (val.startsWith("'#") || val.startsWith('"#')) {
          fileReport.manualReviews.push({
            line: lineNum,
            reason: `Color no mapeado de forma automática en ${prop}`,
            content: fullMatch,
          });
          totalManualReviews++;
        }
      }
    }

    // 3. fontSize
    const fontRegex = /\b(fontSize)\s*:\s*(\d+)/g;
    let fontMatch;
    while ((fontMatch = fontRegex.exec(line)) !== null) {
      const fullMatch = fontMatch[0];
      const val = parseInt(fontMatch[2], 10);
      if (SAFE_FONT_SIZE_MAP[val]) {
        const replacementToken = SAFE_FONT_SIZE_MAP[val];
        modifiedLine = modifiedLine.replace(fullMatch, `fontSize: ${replacementToken}`);
        usedTokens.add('typography');
        fileReport.safeReplacements.push({
          line: lineNum,
          prop: 'fontSize',
          from: val,
          to: replacementToken,
        });
        totalSafeReplacements++;
        fileModified = true;
      } else {
        fileReport.manualReviews.push({
          line: lineNum,
          reason: `fontSize ${val} requiere revisión manual (ambiguo o no estándar)`,
          content: fullMatch,
        });
        totalManualReviews++;
      }
    }

    // 4. borderRadius
    const radiusRegex = /\b(borderRadius)\s*:\s*(\d+)/g;
    let radiusMatch;
    while ((radiusMatch = radiusRegex.exec(line)) !== null) {
      const fullMatch = radiusMatch[0];
      const val = parseInt(radiusMatch[2], 10);
      if (SAFE_BORDER_RADIUS_MAP[val]) {
        const replacementToken = SAFE_BORDER_RADIUS_MAP[val];
        modifiedLine = modifiedLine.replace(fullMatch, `borderRadius: ${replacementToken}`);
        usedTokens.add('radii');
        fileReport.safeReplacements.push({
          line: lineNum,
          prop: 'borderRadius',
          from: val,
          to: replacementToken,
        });
        totalSafeReplacements++;
        fileModified = true;
      } else {
        fileReport.manualReviews.push({
          line: lineNum,
          reason: `borderRadius ${val} requiere revisión manual (24, 28 u otro contenedor)`,
          content: fullMatch,
        });
        totalManualReviews++;
      }
    }

    // 5. padding y margin
    for (const prop of SPACING_PROPS) {
      const spaceRegex = new RegExp(`\\b(${prop})\\s*:\\s*(\\d+)`, 'g');
      let spaceMatch;
      while ((spaceMatch = spaceRegex.exec(line)) !== null) {
        const fullMatch = spaceMatch[0];
        const val = parseInt(spaceMatch[2], 10);
        if (SAFE_SPACING_MAP[val]) {
          const replacementToken = SAFE_SPACING_MAP[val];
          modifiedLine = modifiedLine.replace(fullMatch, `${prop}: ${replacementToken}`);
          usedTokens.add('spacing');
          fileReport.safeReplacements.push({
            line: lineNum,
            prop,
            from: val,
            to: replacementToken,
          });
          totalSafeReplacements++;
          fileModified = true;
        }
      }
    }

    modifiedLines[i] = modifiedLine;
  }

  // Si se modificó y hay tokens usados, gestionar imports
  if (fileModified && usedTokens.size > 0) {
    const importPath = getThemeImportPath(filePath);
    let finalContent = modifiedLines.join('\n');

    // Buscar import existente desde importPath
    const importRegex = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${importPath.replace(/\./g, '\\.')}['"];?`);
    const match = finalContent.match(importRegex);

    if (match) {
      const existingTokens = match[1].split(',').map(s => s.trim()).filter(Boolean);
      const allTokens = Array.from(new Set([...existingTokens, ...usedTokens])).sort();
      const newImport = `import { ${allTokens.join(', ')} } from '${importPath}';`;
      finalContent = finalContent.replace(match[0], newImport);
    } else {
      // Insertar import al inicio tras otros imports
      const allTokens = Array.from(usedTokens).sort();
      const newImport = `import { ${allTokens.join(', ')} } from '${importPath}';\n`;
      // Insertar después del último import
      const lastImportIndex = finalContent.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLastImport = finalContent.indexOf('\n', lastImportIndex);
        finalContent = finalContent.slice(0, endOfLastImport + 1) + newImport + finalContent.slice(endOfLastImport + 1);
      } else {
        finalContent = newImport + finalContent;
      }
    }

    if (!isDryRun) {
      try {
        fs.writeFileSync(filePath, finalContent, 'utf-8');
      } catch (err) {
        console.error(`[ERROR] No se pudo escribir en ${filePath}`, err);
        hasErrors = true;
      }
    }
  }

  report.push(fileReport);
}

// ─── Ejecución Principal ────────────────────────────────────────────────────
function main() {
  const rootDir = path.resolve(__dirname, '..');
  const targetDirs = [
    path.join(rootDir, 'src', 'components'),
    path.join(rootDir, 'app'),
  ];

  const files = [];

  function collectFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        collectFiles(full);
      } else if (ent.isFile() && (ent.name.endsWith('.tsx') || ent.name.endsWith('.ts'))) {
        // Excluir theme/ y tests
        if (!full.includes(path.join('src', 'theme')) && !ent.name.endsWith('.test.ts') && !ent.name.endsWith('.test.tsx')) {
          files.push(full);
        }
      }
    }
  }

  targetDirs.forEach(collectFiles);

  console.log(`\n======================================================`);
  console.log(`  CODEMOD MIGRACIÓN DE TOKENS (${isDryRun ? 'MODO --dry-run' : 'EJECUCIÓN REAL'})`);
  console.log(`======================================================\n`);
  console.log(`Archivos detectados: ${files.length}\n`);

  files.forEach(processFile);

  // Imprimir reporte detallado
  report.forEach(r => {
    if (r.safeReplacements.length > 0 || r.manualReviews.length > 0) {
      const relPath = path.relative(rootDir, r.filePath);
      console.log(`\n📁 Archivo: ${relPath}`);
      if (r.safeReplacements.length > 0) {
        console.log(`   ✅ Reemplazos seguros (${r.safeReplacements.length}):`);
        r.safeReplacements.slice(0, 5).forEach(s => {
          console.log(`      L${s.line} | ${s.prop}: ${s.from} ➔ ${s.to}`);
        });
        if (r.safeReplacements.length > 5) {
          console.log(`      ... y ${r.safeReplacements.length - 5} más`);
        }
      }
      if (r.manualReviews.length > 0) {
        console.log(`   ⚠️ Casos para revisión manual (${r.manualReviews.length}):`);
        r.manualReviews.forEach(m => {
          console.log(`      L${m.line} | [${m.reason}] ${m.content}`);
        });
      }
    }
  });

  console.log(`\n======================================================`);
  console.log(`  RESUMEN`);
  console.log(`======================================================`);
  console.log(`Total reemplazos seguros: ${totalSafeReplacements}`);
  console.log(`Total casos de revisión manual: ${totalManualReviews}`);
  console.log(`Estado: ${hasErrors ? 'CON ERRORES' : 'EXITOSO'}\n`);

  if (hasErrors) {
    process.exit(1);
  }
}

main();
