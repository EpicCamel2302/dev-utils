#!/usr/bin/env bun
/**
 * @name App Map
 * @description Maps the application structure starting from the given entry point.
 * @param entry:string:required The entry point of the application
 * @param appType:select:optional:vite,none The type of application (default: vite)
 * @param ignoreExternals:boolean:optional:false Whether to ignore external dependencies (default: false)
 * @context terminal
 * @category development
 */

import * as path from 'path';
import * as fs from 'fs';

// Get the entry point from command line arguments
const entryPoint = process.argv[2];
const appType = process.argv[3] || 'vite';
const ignoreExternals = process.argv[4] === 'true' || false;

/**
 * Reads the content of a file, using the mock system for demonstration.
 * In a real application, this would use Node.js 'fs'.
 * @param filePath The absolute or relative path to the file.
 * @returns The file content as a string, or null if not found.
 */
function getFileContent(filePath: string): string | null {
    try {
        // Try to read the file content
        return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        // if we can't read the file, return null
        // It's likely a node_module or external dependency
        return null;
    }
}

/**
 * Resolves an imported path to a full, recognizable file path.
 * This is crucial for handling relative paths and guessing extensions.
 * @param basePath The directory of the file making the import.
 * @param importedPath The path from the import statement (e.g., './Sidebar.vue').
 * @returns The resolved, normalized file path.
 */
function resolvePath(basePath: string, importedPath: string): string {
    // 1. Handle common aliases (e.g., '@/') - Customize this for your build system
    if (importedPath.startsWith('@/')) {
        // Assume '@/' resolves to the root directory, which we approximate as the CWD or 'app.vue' base
        importedPath = importedPath.replace('@/', './');
    }

    // 2. Resolve the path relative to the base directory
    const resolved = path.join(path.dirname(basePath), importedPath);

    // 3. Check for extensions
    const extensions = ['.vue', '.js', '.ts'];
    if (path.extname(resolved) === '') {
        for (const ext of extensions) {
            // Check if the file exists with one of the extensions
            if (fs.existsSync(resolved + ext)) {
                return resolved + ext;
            }
        }
    }

    // Default return (may still include an extension if present in the import string)
    return resolved;
}

/**
 * Recursively parses the component tree.
 * @param filePath The current file path being analyzed.
 * @param indent The current indentation level for printing.
 * @param traversed A Set of file paths to prevent infinite recursion (cycles).
 */
function buildTree(filePath: string, indent: string = '', traversed: Set<string> = new Set<string>()): void {
    const normalizedPath = filePath.replace(/\\/g, '/'); // Normalize for display

    // Check for cycles
    if (traversed.has(normalizedPath)) {
        console.log(`${indent}|- ${path.basename(normalizedPath)} [CYCLE DETECTED]`);
        return;
    }

    // Read the file content
    const content = getFileContent(normalizedPath);
    if (content === null) {
        // Only show if it's not the root path and we couldn't resolve it
        if (indent !== '' && !ignoreExternals) {
            console.log(`${indent}|- ${path.basename(normalizedPath)} [File Not Found/External]`);
        }
        return;
    }

    traversed.add(normalizedPath);

    // Print the current component/file name
    console.log(`${indent}|- ${path.basename(normalizedPath)}`);

    // Use a simple regex to capture imported module paths
    const importRegex = /(?:from\s+['"]|import\s+['"])([^'"]+)/g;
    let match;
    const dependencies: string[] = [];

    while ((match = importRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
    }

    const nextIndent = indent + '|       ';

    // Recursively process dependencies
    for (const depPath of dependencies) {
        const resolvedDepPath = resolvePath(filePath, depPath);

        // Create a copy of the traversed set for the next level of recursion
        // to ensure siblings don't inherit the parent's paths, but children do.
        buildTree(resolvedDepPath, nextIndent, new Set(traversed));
    }
}

/**
 * Main function to execute the script.
 */
function main() {
    console.log(`Analyzing component tree starting from: ${entryPoint}\n`);
    buildTree(entryPoint);
    console.log("\n--- Analysis Complete ---");
}

// Execute the main function
main();
