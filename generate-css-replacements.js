#!/usr/bin/env node

/**
 * CSS Replacement Generator
 *
 * Takes a CSV export from the CSS Class Analyzer and generates a replacement
 * stylesheet containing only the Css framework classes you're actually using.
 *
 * Edit the Framework patterns and minimum usage threshold as needed.
 *
 * Useful for the process of ejecting from UI Frameworks while retaining
 * only the styles you actually use.
 *
 * Usage:
 *   node generate-css-replacements.js css-analysis-export.csv
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FRAMEWORK_PATTERNS = [
  'bootstrap',
  'coreui',
  '@coreui',
  'node_modules/bootstrap',
  'node_modules/@coreui'
];

const MIN_USAGE_THRESHOLD = 1; // Only include classes used on at least this many elements

// Parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

  const data = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 1; i < lines.length; i++) {
    currentLine += lines[i];

    // Count quotes to determine if we're inside a quoted field
    const quoteCount = (currentLine.match(/"/g) || []).length;
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes && currentLine.trim()) {
      const values = [];
      let currentValue = '';
      let insideQuote = false;

      for (let char of currentLine) {
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(currentValue.replace(/^"|"$/g, '').trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.replace(/^"|"$/g, '').trim());

      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }

      currentLine = '';
    } else if (!inQuotes) {
      currentLine = '';
    } else {
      currentLine += '\n';
    }
  }

  return data;
}

// Check if a file is from Bootstrap or CoreUI
function isFrameworkFile(sourceFile, compiledFile) {
  const filesToCheck = [sourceFile, compiledFile].filter(Boolean);

  return filesToCheck.some(file =>
    FRAMEWORK_PATTERNS.some(pattern =>
      file.toLowerCase().includes(pattern.toLowerCase())
    )
  );
}

// Group classes by category
function categorizeClass(className, selector) {
  const categories = {
    'Layout': /^(container|row|col|d-|flex|justify|align|order|offset)/,
    'Spacing': /^(m[trblxy]?|p[trblxy]?|g[xy]?)-/,
    'Typography': /^(text|font|fw|fst|lh|fs)-/,
    'Colors': /^(bg|text|border)-(primary|secondary|success|danger|warning|info|light|dark|white|muted)/,
    'Buttons': /^btn/,
    'Forms': /^(form|input|select|label|check|switch|range)/,
    'Cards': /^card/,
    'Tables': /^table/,
    'Alerts': /^alert/,
    'Badges': /^badge/,
    'Breadcrumbs': /^breadcrumb/,
    'Dropdowns': /^(dropdown|dropup|dropstart|dropend)/,
    'Modals': /^modal/,
    'Navs': /^(nav|navbar|nav-item|nav-link)/,
    'Pagination': /^(page|pagination)/,
    'Progress': /^progress/,
    'Spinners': /^spinner/,
    'Tooltips': /^tooltip/,
    'Popovers': /^popover/,
    'Borders': /^(border|rounded)/,
    'Sizing': /^(w-|h-|mw-|mh-|vw-|vh-)/,
    'Position': /^(position|top|bottom|start|end|translate)/,
    'Display': /^(d-|visible|invisible)/,
    'Overflow': /^overflow/,
    'Shadows': /^shadow/,
    'Opacity': /^opacity/,
    'Other': /.*/
  };

  for (const [category, pattern] of Object.entries(categories)) {
    if (pattern.test(className)) {
      return category;
    }
  }

  return 'Other';
}

// Generate CSS from class definitions
function generateCSS(classes) {
  // Deduplicate by selector AND CSS content (same selector with same properties)
  const selectorMap = new Map();

  classes.forEach(cls => {
    // Normalize CSS text for comparison (remove extra spaces, sort properties)
    const normalizedCSS = cls.cssText
      .split(';')
      .map(p => p.trim())
      .filter(p => p)
      .sort()
      .join('; ');

    const key = `${cls.selector}::${cls.mediaQuery || 'no-media'}::${normalizedCSS}`;

    if (!selectorMap.has(key)) {
      selectorMap.set(key, {
        ...cls,
        classNames: new Set([cls.className])
      });
    } else {
      // Same selector with same CSS - just track additional class names
      selectorMap.get(key).classNames.add(cls.className);
      // Keep the highest usage count
      const existing = selectorMap.get(key);
      existing.usageCount = Math.max(existing.usageCount, cls.usageCount);
    }
  });

  const uniqueSelectors = Array.from(selectorMap.values());

  // Now categorize the unique selectors
  const categorized = {};

  uniqueSelectors.forEach(cls => {
    const category = categorizeClass(cls.className, cls.selector);
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(cls);
  });

  let css = `/**
 * Bootstrap/CoreUI Replacement Stylesheet
 *
 * Auto-generated from CSS analysis
 * Contains only the classes actually used in your application
 *
 * Generated: ${new Date().toISOString()}
 */

`;

  // Generate CSS for each category
  const categoryOrder = [
    'Layout', 'Spacing', 'Typography', 'Colors', 'Buttons', 'Forms',
    'Cards', 'Tables', 'Alerts', 'Badges', 'Breadcrumbs', 'Dropdowns',
    'Modals', 'Navs', 'Pagination', 'Progress', 'Spinners', 'Tooltips',
    'Popovers', 'Borders', 'Sizing', 'Position', 'Display', 'Overflow',
    'Shadows', 'Opacity', 'Other'
  ];

  categoryOrder.forEach(category => {
    const classes = categorized[category];
    if (!classes || classes.length === 0) return;

    css += `\n/* ========================================\n   ${category}\n   ======================================== */\n\n`;

    classes.forEach(cls => {
      const classNamesList = Array.from(cls.classNames).join(', .');
      css += `/* Classes: .${classNamesList} */\n`;
      css += `/* Used by: ${cls.usageCount} element${cls.usageCount !== 1 ? 's' : ''} */\n`;

      if (cls.mediaQuery) {
        css += `@media ${cls.mediaQuery} {\n`;
        css += `  ${cls.selector} {\n`;

        // Format CSS properties
        const properties = cls.cssText.split(';').filter(p => p.trim());
        properties.forEach(prop => {
          const trimmed = prop.trim();
          if (trimmed) {
            css += `    ${trimmed};\n`;
          }
        });

        css += `  }\n`;
        css += `}\n\n`;
      } else {
        css += `${cls.selector} {\n`;

        // Format CSS properties
        const properties = cls.cssText.split(';').filter(p => p.trim());
        properties.forEach(prop => {
          const trimmed = prop.trim();
          if (trimmed) {
            css += `  ${trimmed};\n`;
          }
        });

        css += `}\n\n`;
      }
    });
  });

  return css;
}

// Generate summary report
function generateReport(allClasses, frameworkClasses, usedClasses, totalDefinitions, uniqueSelectors) {
  const report = `# CSS Replacement Analysis Report

**Generated:** ${new Date().toISOString()}

## Summary

- **Total classes analyzed:** ${allClasses.length}
- **Bootstrap/CoreUI classes found:** ${frameworkClasses.length}
- **Actually used (≥${MIN_USAGE_THRESHOLD} elements):** ${usedClasses.length}
- **Unused framework classes:** ${frameworkClasses.length - usedClasses.length}
- **Total CSS rule definitions:** ${totalDefinitions}
- **Unique selectors after deduplication:** ${uniqueSelectors}
- **Reduction:** ${totalDefinitions - uniqueSelectors} duplicate selectors removed (${((1 - uniqueSelectors / totalDefinitions) * 100).toFixed(1)}% reduction)

## Usage Statistics

${usedClasses.map(cls =>
  `- \`.${cls.className}\` - ${cls.usageCount} element${cls.usageCount !== 1 ? 's' : ''}`
).join('\n')}

## Categorization

${Object.entries(
  usedClasses.reduce((acc, cls) => {
    const cat = categorizeClass(cls.className, cls.selector);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {})
).map(([cat, count]) => `- **${cat}**: ${count} classes`).join('\n')}

## Next Steps

1. Review the generated \`bootstrap-replacements.css\` file
2. Import it in your main stylesheet or Vite config
3. Test thoroughly on all pages
4. Remove Bootstrap/CoreUI imports once validated
5. Optionally rename classes to your own naming convention

## Potential Issues to Watch For

- **Responsive classes**: Make sure breakpoint behavior matches your needs
- **JavaScript dependencies**: Some classes may have JS behavior (modals, dropdowns, etc.)
- **Pseudo-classes**: Check :hover, :focus, :active states are preserved
- **Specificity**: Ensure cascade order is correct in your app

`;

  return report;
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node generate-css-replacements.js <csv-file>');
    console.error('');
    console.error('Example:');
    console.error('  node generate-css-replacements.js css-analysis-2025-11-22T14-30-45.csv');
    process.exit(1);
  }

  const csvFile = args[0];

  if (!fs.existsSync(csvFile)) {
    console.error(`Error: File not found: ${csvFile}`);
    process.exit(1);
  }

  console.log('📊 CSS Replacement Generator');
  console.log('═══════════════════════════════════════\n');

  console.log(`📄 Reading CSV file: ${csvFile}`);
  const csvContent = fs.readFileSync(csvFile, 'utf-8');

  console.log('🔍 Parsing CSV data...');
  const data = parseCSV(csvContent);
  console.log(`   Found ${data.length} class definitions\n`);

  // Filter for framework classes
  console.log('🎯 Filtering Bootstrap/CoreUI classes...');
  const frameworkClasses = data.filter(row =>
    isFrameworkFile(row['Source File'], row['Compiled File'])
  );
  console.log(`   Found ${frameworkClasses.length} framework class definitions\n`);

  // Group by class name and sum usage
  const classUsage = new Map();
  frameworkClasses.forEach(row => {
    const className = row['Class Name'];
    const usageCount = parseInt(row['Elements Using Class']) || 0;

    if (!classUsage.has(className)) {
      classUsage.set(className, {
        className,
        usageCount: 0,
        definitions: []
      });
    }

    const cls = classUsage.get(className);
    cls.usageCount = Math.max(cls.usageCount, usageCount);
    cls.definitions.push({
      selector: row['Selector'],
      cssText: row['CSS Properties'],
      specificity: row['Specificity'],
      mediaQuery: row['Media Query'],
      sourceFile: row['Source File']
    });
  });

  // Filter for actually used classes
  console.log(`🔧 Filtering for classes used by ≥${MIN_USAGE_THRESHOLD} elements...`);
  const usedClasses = Array.from(classUsage.values())
    .filter(cls => cls.usageCount >= MIN_USAGE_THRESHOLD)
    .sort((a, b) => b.usageCount - a.usageCount);

  console.log(`   Found ${usedClasses.length} used classes\n`);

  // Expand definitions
  const expandedClasses = [];
  usedClasses.forEach(cls => {
    cls.definitions.forEach(def => {
      expandedClasses.push({
        className: cls.className,
        usageCount: cls.usageCount,
        selector: def.selector,
        cssText: def.cssText,
        specificity: def.specificity,
        mediaQuery: def.mediaQuery,
        sourceFile: def.sourceFile
      });
    });
  });

  // Generate CSS
  console.log('📝 Generating replacement CSS...');
  const css = generateCSS(expandedClasses);
  const cssFile = 'bootstrap-replacements.css';
  fs.writeFileSync(cssFile, css);

  // Count unique selectors for reporting
  const uniqueSelectors = new Set();
  expandedClasses.forEach(cls => {
    uniqueSelectors.add(`${cls.selector}::${cls.mediaQuery || 'no-media'}`);
  });

  console.log(`   ✓ Wrote ${cssFile}`);
  console.log(`   Reduced ${expandedClasses.length} definitions to ${uniqueSelectors.size} unique selectors\n`);

  // Generate report
  console.log('📋 Generating analysis report...');
  const report = generateReport(data, frameworkClasses, usedClasses, expandedClasses.length, uniqueSelectors.size);
  const reportFile = 'css-replacement-report.md';
  fs.writeFileSync(reportFile, report);
  console.log(`   ✓ Wrote ${reportFile}\n`);

  // Summary
  console.log('✅ Complete!\n');
  console.log('Files generated:');
  console.log(`  - ${cssFile} (${(css.length / 1024).toFixed(1)} KB)`);
  console.log(`  - ${reportFile}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review the generated CSS file');
  console.log('  2. Import it in your project:');
  console.log('     import "./bootstrap-replacements.css"');
  console.log('  3. Test thoroughly');
  console.log('  4. Remove Bootstrap/CoreUI imports');
  console.log('');
}

main();
