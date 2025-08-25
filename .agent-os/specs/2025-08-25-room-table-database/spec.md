# Spec Requirements Document

> Spec: Room Table Database Setup with YAML World Seeding
> Created: 2025-08-25
> Status: Planning

## Overview

Implement a structured Room table in Shadow Kingdom's Prisma database with YAML-based world seeding capability. The system will consume YAML files to create initial game worlds with predefined rooms, connections, and regions, while supporting AI-powered expansion during gameplay.

## User Stories

### YAML World Definition
As a game designer, I want to define starting worlds using YAML configuration files, so that I can easily create and modify initial game areas without writing database code.

The system will read YAML files containing room definitions, connections, and regional themes, automatically creating the database entries and establishing proper relationships between rooms, regions, and connections.

### Structured Room Data
As a game developer, I want rooms with structured descriptive content (name, description, extended_description), so that the AI world generation system can provide consistent, immersive location experiences for players.

Each room will have a concise name, atmospheric description for entry, and optional extended description for detailed examination, all definable through YAML and stored in the Prisma database.

### Database Integration with Seeding
As a system architect, I want a properly structured database schema with YAML seeding capability, so that initial worlds can be rapidly prototyped and deployed while maintaining type-safety and proper relationships.

The system will parse YAML world files and create all necessary database entries through Prisma, ensuring referential integrity and proper foreign key relationships.

## Spec Scope

1. **Room Table Schema** - Create Prisma model with id, name, description, extended_description, gameId, regionId, and metadata fields
2. **YAML World Format** - Define YAML schema for describing rooms, regions, and connections
3. **YAML Parser Service** - Implement service to consume YAML files and create database entries
4. **Prisma Configuration** - Set up complete Prisma schema file with SQLite datasource and proper relationships
5. **Database Service** - Implement PrismaService singleton for type-safe database operations
6. **Seeding Scripts** - Create scripts to initialize database from YAML world definitions

## Out of Scope

- AI world generation logic (handled by separate services)
- Player movement commands (handled by game controller)
- Advanced RPG systems like combat or inventory (future enhancements)
- Real-time YAML reloading (initial seeding only)

## Expected Deliverable

1. Complete Prisma schema with functional Room table and all relationships
2. YAML world format specification with example world file
3. Working YAML parser that creates games, regions, rooms, and connections from configuration files

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-25-room-table-database/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-25-room-table-database/sub-specs/technical-spec.md
- Database Schema: @.agent-os/specs/2025-08-25-room-table-database/sub-specs/database-schema.md