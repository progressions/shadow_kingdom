# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-25-room-table-database/spec.md

> Created: 2025-08-25
> Status: Ready for Implementation

## Tasks

- [ ] 1. **Set up Prisma Database Schema and Configuration**
  - [ ] 1.1 Write tests for Prisma client initialization and database connection
  - [ ] 1.2 Install Prisma dependencies (prisma, @prisma/client)
  - [ ] 1.3 Initialize Prisma configuration with SQLite datasource
  - [ ] 1.4 Create complete schema.prisma with Game, Room, Region, Connection models
  - [ ] 1.5 Generate initial migration and Prisma client
  - [ ] 1.6 Create PrismaService singleton with proper connection management
  - [ ] 1.7 Update package.json with database scripts (db:generate, db:push, db:migrate)
  - [ ] 1.8 Verify all tests pass and database connection works

- [ ] 2. **Create YAML World Parser Service**
  - [ ] 2.1 Write tests for YAML parsing and validation logic
  - [ ] 2.2 Install YAML parsing dependency (js-yaml) and validation library (zod)
  - [ ] 2.3 Define TypeScript interfaces for WorldDefinition and related types
  - [ ] 2.4 Implement YamlWorldService with parse and validate methods
  - [ ] 2.5 Add validation for room connectivity and reference integrity
  - [ ] 2.6 Create error handling for invalid YAML structures
  - [ ] 2.7 Implement atomic database creation from parsed YAML data
  - [ ] 2.8 Verify all tests pass with valid and invalid YAML inputs

- [ ] 3. **Create Starting Region YAML File and Database Seeding**
  - [ ] 3.1 Write tests for world seeding from YAML file
  - [ ] 3.2 Create worlds/starting-region.yml with 12-room castle layout
  - [ ] 3.3 Define all rooms with name, description, extended_description fields
  - [ ] 3.4 Add complete bi-directional connection network between rooms
  - [ ] 3.5 Include locked unfilled connection from gatehouse (requires ancient_iron_key)
  - [ ] 3.6 Add Ancient Iron Key item in study room (hidden)
  - [ ] 3.7 Add Spectral Guardian hostile character in throne room
  - [ ] 3.8 Verify seeded world has proper connectivity and all references resolve

- [ ] 4. **Implement Database Operations and Item/Character Models**
  - [ ] 4.1 Write tests for item and character database operations
  - [ ] 4.2 Add Item and Character models to Prisma schema
  - [ ] 4.3 Create database migration for new Item and Character tables
  - [ ] 4.4 Extend YamlWorldService to handle items and characters seeding
  - [ ] 4.5 Implement item placement logic with hidden item discovery
  - [ ] 4.6 Implement character placement with combat stats and loot
  - [ ] 4.7 Add validation for locked connections requiring specific keys
  - [ ] 4.8 Verify all tests pass and complete world can be seeded from YAML

- [ ] 5. **Create World Seeding CLI Script and Integration**
  - [ ] 5.1 Write tests for CLI world seeding functionality
  - [ ] 5.2 Create scripts/seedWorld.ts for command-line world seeding
  - [ ] 5.3 Add database initialization utilities in src/utils/initDb.ts
  - [ ] 5.4 Implement game creation with YAML world seeding
  - [ ] 5.5 Add proper error handling and user feedback for seeding process
  - [ ] 5.6 Create npm script "db:seed" for easy world seeding
  - [ ] 5.7 Add example world files and documentation
  - [ ] 5.8 Verify complete end-to-end workflow from YAML to playable game world