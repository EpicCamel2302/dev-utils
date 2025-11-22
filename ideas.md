# Dev Utils Ideas

Useful scripts and utilities for a lead frontend developer.

## Development Environment & Setup
- **Node version manager helper** - Script to auto-detect and switch to project's Node version from `.nvmrc` or `package.json`
- **Fresh install script** - Clean reinstall of dependencies (removes `node_modules`, lock files, and caches)
- **Environment checker** - Validates all required tools are installed (Node, npm/yarn/pnpm, Docker, etc.) with correct versions

## Code Quality & Analysis
- **Unused dependencies finder** - Detects dependencies in `package.json` that aren't actually imported
- **Bundle size analyzer** - Quick script to analyze and compare bundle sizes over time
- **Circular dependency detector** - Finds circular imports that can cause issues
- **Dead code finder** - Uses AST to find unused exports across the codebase
- **Duplicate code detector** - Finds similar code blocks that could be refactored

## Git & Version Control
- **Smart branch cleanup** - Removes merged branches (local/remote) with safety checks
- **Commit message linter** - Validates commit messages follow conventional commits
- **PR description generator** - Uses git diff to suggest PR descriptions
- **Changelog generator** - Auto-generates changelog from commit history

## Testing & CI/CD
- **Test file generator** - Creates test file templates based on source files
- **Coverage threshold checker** - Fails if coverage drops below configured threshold
- **Visual regression setup** - Quick setup for visual regression testing
- **CI time analyzer** - Analyzes which CI steps take longest

## Performance & Optimization
- **Image optimizer** - Batch compress/convert images to modern formats (WebP, AVIF)
- **Lighthouse runner** - Run Lighthouse audits and track scores over time
- **Font subsetter** - Generate subsetted fonts for faster loading

## Debugging & Development
- **Port killer** - Kill processes on specific ports (goodbye "port already in use")
- **Local SSL cert generator** - Quick HTTPS setup for local development
- **API mock server** - Simple configurable mock API server
- **Console log stripper** - Remove all console.logs before commit

## Project Management
- **Project scaffolder** - Template generator for new components/features following team conventions
- **Dependency updater** - Interactive tool to safely update dependencies
- **Migration helper** - Scripts for common migrations (Vue 2→3, Webpack→Vite, etc.)

## Documentation
- **Component documenter** - Auto-generate component documentation from JSDoc/TypeScript
- **API endpoint lister** - Extract and document all API endpoints from codebase

## Most Immediately Useful

Top 5 most useful across projects:

1. **Port killer** - Solves the daily "port in use" annoyance
2. **Fresh install script** - Saves time when dependencies get wonky
3. **Smart branch cleanup** - Keeps git clean without fear
4. **Bundle size analyzer** - Catch performance issues early
5. **Environment checker** - Onboard new devs faster
