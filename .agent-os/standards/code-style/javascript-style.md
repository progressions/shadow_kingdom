# Javascript Style Guide

## Semicolons
- Do not use semicolons
- Rely on Automatic Semicolon Insertion (ASI)
- Use semicolons only when required to prevent parsing errors

## Imports
- Use TypeScript path aliases with "@" prefix
- Import from "@/components", "@/types", "@/utils", etc.
- Prefer absolute imports over relative imports for better maintainability
- Create subdirectories with index.ts files for clean imports
- Import from directory index rather than specific files: `import { Component } from "@/components"` not `import Component from "@/components/Component"`

## Type Definitions
- Place all type definitions in `src/types` directory
- Import types using "@/types" alias
- Organize types by feature or domain when appropriate
- Use `type` instead of `interface` for type definitions

## Variable Naming
- Use camelCase for variable and function names
- Use PascalCase for type definitions and component names
