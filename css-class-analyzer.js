/**
 * CSS Class Analyzer
 *
 * Analyzes all elements on the page to determine:
 * - Which CSS classes are applied to each element
 * - Which files those classes come from
 * - If any classes have conflicts (defined in multiple files)
 * - Which conflicting definition is actually applied
 *
 * Usage: Copy this script and paste it into your browser's DevTools console
 */

(async function() {
  console.log('🔍 Starting CSS Class Analysis...\n');

  // Get all stylesheets
  const stylesheets = Array.from(document.styleSheets).filter(sheet => {
    try {
      // Test if we can access cssRules (will throw for cross-origin sheets without CORS)
      sheet.cssRules;
      return true;
    } catch (e) {
      console.warn(`⚠️ Cannot access stylesheet: ${sheet.href || 'inline'} (CORS restriction)`);
      return false;
    }
  });

  console.log(`📄 Found ${stylesheets.length} accessible stylesheets\n`);

  // Source map cache
  const sourceMaps = new Map(); // stylesheet URL -> parsed source map

  // Function to fetch and parse source map
  async function getSourceMap(stylesheetHref, sheet) {
    // For inline styles, check if they have ownerNode with data attributes
    if (!stylesheetHref || stylesheetHref.startsWith('<style')) {
      // Try to extract source map from inline style element
      if (sheet && sheet.ownerNode) {
        const styleElement = sheet.ownerNode;
        const textContent = styleElement.textContent || styleElement.innerHTML;

        // Check for inline source map
        const inlineMapMatch = textContent.match(/\/\*#\s*sourceMappingURL=data:application\/json;base64,([^\s*]+)\s*\*\//);
        if (inlineMapMatch) {
          try {
            const decoded = atob(inlineMapMatch[1]);
            const sourceMap = JSON.parse(decoded);
            return sourceMap;
          } catch (e) {
            console.warn('⚠️ Could not parse inline source map:', e.message);
          }
        }
      }
      return null;
    }

    if (sourceMaps.has(stylesheetHref)) {
      return sourceMaps.get(stylesheetHref);
    }

    try {
      // Fetch the CSS file to look for sourceMappingURL
      const cssResponse = await fetch(stylesheetHref);
      const cssText = await cssResponse.text();

      // Check for inline base64 encoded source map first (Vite dev mode)
      const inlineMapMatch = cssText.match(/\/\*#\s*sourceMappingURL=data:application\/json;base64,([^\s*]+)\s*\*\//);
      if (inlineMapMatch) {
        try {
          const decoded = atob(inlineMapMatch[1]);
          const sourceMap = JSON.parse(decoded);
          sourceMaps.set(stylesheetHref, sourceMap);
          return sourceMap;
        } catch (e) {
          console.warn('⚠️ Could not parse inline source map:', e.message);
        }
      }

      // Look for external source map URL
      const sourceMapMatch = cssText.match(/\/\*#\s*sourceMappingURL=([^\s*]+)\s*\*\//);

      if (!sourceMapMatch) {
        sourceMaps.set(stylesheetHref, null);
        return null;
      }

      const sourceMapUrl = new URL(sourceMapMatch[1], stylesheetHref).href;

      // Fetch and parse source map
      const mapResponse = await fetch(sourceMapUrl);
      const sourceMap = await mapResponse.json();

      sourceMaps.set(stylesheetHref, sourceMap);
      return sourceMap;
    } catch (e) {
      console.warn(`⚠️ Could not load source map for ${stylesheetHref}:`, e.message);
      sourceMaps.set(stylesheetHref, null);
      return null;
    }
  }

  // Function to get all unique sources from source map
  function getAllSourcesFromMap(sourceMap) {
    if (!sourceMap) {
      return [];
    }

    try {
      const sources = sourceMap.sources || [];
      return sources.map(source => {
        // Clean up the source path
        let sourcePath = source;

        // Remove webpack/vite prefixes
        sourcePath = sourcePath.replace(/^webpack:\/\/\//, '');
        sourcePath = sourcePath.replace(/^\/+/, '');
        sourcePath = sourcePath.replace(/^\.\.\//g, '');
        sourcePath = sourcePath.replace(/^\.\//, '');

        return sourcePath;
      }).filter(s => s && s.length > 0);
    } catch (e) {
      return [];
    }
  }

  // Build a map of class definitions to their source files
  const classDefinitions = new Map(); // className -> [{file, rule, specificity}]

  function getSpecificity(selector) {
    // Simple specificity calculator
    const ids = (selector.match(/#/g) || []).length;
    const classes = (selector.match(/\./g) || []).length;
    const attrs = (selector.match(/\[/g) || []).length;
    const pseudoClasses = (selector.match(/:/g) || []).length - (selector.match(/::/g) || []).length;
    const elements = selector.split(/[\s>+~]/).filter(s => s && !s.match(/^[#.\[:]/) && s !== '*').length;

    return {
      value: ids * 100 + (classes + attrs + pseudoClasses) * 10 + elements,
      ids,
      classes: classes + attrs + pseudoClasses,
      elements
    };
  }

  function processRules(rules, sourceFile, sourceMap, mediaQuery = null) {
    Array.from(rules).forEach(rule => {
      if (rule instanceof CSSMediaRule) {
        // Recursively process media query rules
        processRules(rule.cssRules, sourceFile, sourceMap, rule.conditionText);
      } else if (rule instanceof CSSStyleRule) {
        const selectors = rule.selectorText.split(',').map(s => s.trim());

        selectors.forEach(selector => {
          // Extract class names from selector
          const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g);

          if (classMatches) {
            classMatches.forEach(match => {
              const className = match.substring(1); // Remove the dot

              if (!classDefinitions.has(className)) {
                classDefinitions.set(className, []);
              }

              // Determine display file
              let displayFile = sourceFile;
              let hasSourceMap = false;

              if (sourceMap) {
                // Get all sources from the source map
                const sources = getAllSourcesFromMap(sourceMap);

                if (sources.length > 0) {
                  hasSourceMap = true;
                  // Use all sources joined (or just first one for single source)
                  if (sources.length === 1) {
                    displayFile = sources[0];
                  } else {
                    // Multiple sources - this is common with Vite
                    // For now, show the first source but indicate there are multiple
                    displayFile = sources.join(', ');
                  }
                }
              }

              classDefinitions.get(className).push({
                file: displayFile,
                originalFile: sourceFile,
                selector: selector,
                specificity: getSpecificity(selector),
                mediaQuery: mediaQuery,
                cssText: rule.style.cssText,
                hasSourceMap: hasSourceMap,
                allSources: sourceMap ? getAllSourcesFromMap(sourceMap) : []
              });
            });
          }
        });
      }
    });
  }

  // Process all stylesheets (async to handle source maps)
  async function processAllStylesheets() {
    console.log('📍 Loading source maps...\n');

    for (const sheet of stylesheets) {
      const sourceFile = sheet.href || (sheet.ownerNode?.id ? `<style id="${sheet.ownerNode.id}">` : '<style inline>');
      const sourceMap = await getSourceMap(sheet.href, sheet);

      if (sourceMap) {
        const sources = getAllSourcesFromMap(sourceMap);
        console.log(`  ✓ Loaded source map for ${sourceFile}`);
        if (sources.length > 0) {
          console.log(`    Sources: ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? ` (+${sources.length - 3} more)` : ''}`);
        }
      }

      try {
        processRules(sheet.cssRules, sourceFile, sourceMap);
      } catch (e) {
        console.warn(`⚠️ Error processing ${sourceFile}:`, e.message);
      }
    }
  }

  // Main async function
  await processAllStylesheets();

  console.log(`✅ Indexed ${classDefinitions.size} unique classes\n`);

  // Find conflicts
  const conflicts = new Map();
  classDefinitions.forEach((definitions, className) => {
    if (definitions.length > 1) {
      // Check if they're from different files OR same selector appears multiple times
      const uniqueFiles = new Set(definitions.map(d => d.file));
      const selectorCounts = new Map();

      // Count occurrences of each selector
      definitions.forEach(def => {
        const key = `${def.file}::${def.selector}`;
        selectorCounts.set(key, (selectorCounts.get(key) || 0) + 1);
      });

      // Has conflict if: multiple files OR any selector appears more than once
      const hasDuplicateSelector = Array.from(selectorCounts.values()).some(count => count > 1);

      if (uniqueFiles.size > 1 || hasDuplicateSelector) {
        conflicts.set(className, definitions);
      }
    }
  });

  console.log(`⚠️ Found ${conflicts.size} classes with conflicts across multiple files\n`);

  // Analyze elements on the page
  const elements = Array.from(document.querySelectorAll('*'));
  const elementAnalysis = [];

  elements.forEach((element, index) => {
    const classList = Array.from(element.classList);

    if (classList.length === 0) return;

    const elementInfo = {
      element: element,
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: [],
      hasConflicts: false
    };

    classList.forEach(className => {
      const definitions = classDefinitions.get(className) || [];
      const isConflicted = conflicts.has(className);

      const classInfo = {
        name: className,
        isConflicted: isConflicted,
        definitions: definitions,
        computedStyles: null
      };

      // If conflicted, determine which rule is actually applied
      if (isConflicted && definitions.length > 0) {
        const computed = window.getComputedStyle(element);
        const appliedStyles = {};

        // Get all CSS properties from all definitions
        const allProps = new Set();
        definitions.forEach(def => {
          const props = def.cssText.split(';').map(p => p.split(':')[0].trim()).filter(p => p);
          props.forEach(prop => allProps.add(prop));
        });

        // Check computed value for each property
        allProps.forEach(prop => {
          if (prop) {
            const computedValue = computed.getPropertyValue(prop);
            if (computedValue) {
              appliedStyles[prop] = computedValue;
            }
          }
        });

        classInfo.computedStyles = appliedStyles;
      }

      elementInfo.classes.push(classInfo);
      if (isConflicted) elementInfo.hasConflicts = true;
    });

    if (elementInfo.hasConflicts) {
      elementAnalysis.push(elementInfo);
    }
  });

  // Display results
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 ANALYSIS RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🔴 CONFLICTS SUMMARY:');
  console.log('───────────────────────────────────────────────────────────');

  conflicts.forEach((definitions, className) => {
    console.group(`%c.${className}`, 'font-weight: bold; color: #e74c3c;');
    console.log(`Found in ${definitions.length} locations:`);

    definitions.forEach((def, i) => {
      console.log(`\n${i + 1}. ${def.file}`);
      console.log(`   Selector: ${def.selector}`);
      console.log(`   Specificity: ${def.specificity.value} (${def.specificity.ids} IDs, ${def.specificity.classes} classes, ${def.specificity.elements} elements)`);
      if (def.mediaQuery) {
        console.log(`   Media Query: @media ${def.mediaQuery}`);
      }
      console.log(`   CSS: ${def.cssText}`);
    });

    console.groupEnd();
  });

  console.log('\n\n🎯 ELEMENTS WITH CONFLICTED CLASSES:');
  console.log('───────────────────────────────────────────────────────────');

  if (elementAnalysis.length === 0) {
    console.log('✅ No elements found with conflicted classes currently in the DOM');
  } else {
    elementAnalysis.forEach((info, index) => {
      const elementDesc = `<${info.tagName}${info.id ? `#${info.id}` : ''}>`;
      console.group(`%c${index + 1}. ${elementDesc}`, 'font-weight: bold; color: #3498db;');
      console.log('Element:', info.element);

      info.classes.forEach(classInfo => {
        if (classInfo.isConflicted) {
          console.group(`%c.${classInfo.name} ⚠️`, 'color: #e67e22;');
          console.log('Defined in:');

          classInfo.definitions.forEach((def, i) => {
            console.log(`${i + 1}. ${def.file} (specificity: ${def.specificity.value})`);
            console.log(`   ${def.cssText}`);
          });

          if (classInfo.computedStyles) {
            console.log('\n✓ Computed styles (actually applied):');
            Object.entries(classInfo.computedStyles).forEach(([prop, value]) => {
              console.log(`   ${prop}: ${value}`);
            });
          }

          console.groupEnd();
        }
      });

      console.groupEnd();
    });
  }

  // Create interactive summary
  console.log('\n\n📋 INTERACTIVE SUMMARY:');
  console.log('───────────────────────────────────────────────────────────');
  console.log('Use these variables to explore further:');
  console.log('');
  console.log('• window.cssAnalysis.conflicts - Map of all conflicted classes');
  console.log('• window.cssAnalysis.allClasses - Map of all class definitions');
  console.log('• window.cssAnalysis.elements - Array of elements with conflicts');
  console.log('• window.cssAnalysis.getClass(className) - Get info about a specific class');
  console.log('• window.cssAnalysis.highlightConflicts() - Highlight all elements with conflicts');
  console.log('• window.cssAnalysis.exportCSV() - Download results as CSV file');

  // Store analysis data globally
  window.cssAnalysis = {
    conflicts: conflicts,
    allClasses: classDefinitions,
    elements: elementAnalysis.map(e => e.element),

    getClass: function(className) {
      const defs = classDefinitions.get(className);
      if (!defs) {
        console.log(`Class ".${className}" not found`);
        return null;
      }
      console.group(`%c.${className}`, 'font-weight: bold;');
      console.log(`Found ${defs.length} definition(s):`);
      defs.forEach((def, i) => {
        console.log(`\n${i + 1}. ${def.file}`);
        console.log(`   Selector: ${def.selector}`);
        console.log(`   Specificity: ${def.specificity.value}`);
        console.log(`   CSS: ${def.cssText}`);
      });
      console.groupEnd();
      return defs;
    },

    highlightConflicts: function() {
      // Remove existing highlights
      document.querySelectorAll('.css-analysis-highlight').forEach(el => {
        el.classList.remove('css-analysis-highlight');
      });

      // Add highlight style
      let style = document.getElementById('css-analysis-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'css-analysis-style';
        style.textContent = `
          .css-analysis-highlight {
            outline: 3px solid #e74c3c !important;
            outline-offset: 2px !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Highlight elements
      elementAnalysis.forEach(info => {
        info.element.classList.add('css-analysis-highlight');
      });

      console.log(`✅ Highlighted ${elementAnalysis.length} elements with conflicted classes`);
      console.log('Run window.cssAnalysis.clearHighlights() to remove highlights');
    },

    clearHighlights: function() {
      document.querySelectorAll('.css-analysis-highlight').forEach(el => {
        el.classList.remove('css-analysis-highlight');
      });
      const style = document.getElementById('css-analysis-style');
      if (style) style.remove();
      console.log('✅ Highlights cleared');
    },

    exportCSV: function() {
      // Create CSV content
      const csvRows = [];

      // Header
      csvRows.push([
        'Class Name',
        'Has Conflict',
        'Definition #',
        'Source File',
        'Compiled File',
        'Has Source Map',
        'Selector',
        'Specificity',
        'Media Query',
        'CSS Properties',
        'Elements Using Class'
      ].map(h => `"${h}"`).join(','));

      // Process all classes
      classDefinitions.forEach((definitions, className) => {
        const isConflicted = conflicts.has(className);
        const elementsUsingClass = Array.from(document.querySelectorAll(`.${className}`)).length;

        definitions.forEach((def, index) => {
          const row = [
            className,
            isConflicted ? 'Yes' : 'No',
            index + 1,
            def.file,
            def.originalFile || def.file,
            def.hasSourceMap ? 'Yes' : 'No',
            def.selector,
            `${def.specificity.value} (IDs:${def.specificity.ids} Classes:${def.specificity.classes} Elements:${def.specificity.elements})`,
            def.mediaQuery || '',
            def.cssText.replace(/"/g, '""'), // Escape quotes
            index === 0 ? elementsUsingClass : '' // Only show count on first row
          ].map(cell => `"${cell}"`).join(',');

          csvRows.push(row);
        });
      });

      // Create blob and download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.setAttribute('href', url);
      link.setAttribute('download', `css-analysis-${timestamp}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`✅ CSV exported with ${classDefinitions.size} classes (${conflicts.size} conflicts)`);
      console.log(`📁 File: css-analysis-${timestamp}.csv`);

      return {
        totalClasses: classDefinitions.size,
        conflicts: conflicts.size,
        rows: csvRows.length - 1
      };
    }
  };

  console.log('\n✅ Analysis complete!');
  console.log('═══════════════════════════════════════════════════════════\n');
})();
