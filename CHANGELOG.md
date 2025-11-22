# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Initial project setup with Bun + Vue 3 + Vite
- Web-based UI for browsing and running scripts
- Auto-discovery of scripts from `scripts/` directory
- Metadata parser for script annotations (@name, @description, @param, etc.)
- Real-time output streaming via Server-Sent Events
- Auto-generated parameter forms based on script metadata
- Support for multiple parameter types (string, number, boolean, select)
- Script execution with stdout/stderr capture
- Server-side logging to `scripts.log` (auto-trimmed to ~5MB / 35k lines)
- Console logging for real-time monitoring
- Category-based script organization
- Dark theme UI with syntax highlighting
- Example scripts: Port Killer, Fresh Install, Git Branch Cleanup, Hello World
- Concurrent dev mode script (runs server + web UI together)
- Support for bash (.sh), JavaScript (.js), and TypeScript (.ts) scripts
