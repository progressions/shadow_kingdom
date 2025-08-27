# YAML-based Color Theming System - Lite Summary

Replace hardcoded chalk colors throughout Shadow Kingdom with a YAML-based theming system loaded at startup for centralized color management.

## Key Points
- Move from hardcoded chalk.color() calls to a single YAML theme file
- Create ColorThemeService for centralized color application
- Load theme once at startup with white color as universal fallback
- Change room descriptions from blue to white per requirements