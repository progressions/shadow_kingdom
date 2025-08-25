# Room Table Database Setup with YAML Seeding - Lite Summary

Implement structured Room table in Shadow Kingdom's Prisma database with YAML-based world seeding capability. The system will consume YAML configuration files to create initial game worlds with predefined rooms, connections, and regions, supporting structured descriptive content (name, description, extended_description) while maintaining type-safety and proper database relationships through Prisma ORM.

## Key Points
- Extend Prisma Room model with structured content fields (name, description, extended_description)
- Create YAML-based world seeding system for initial game world configuration
- Implement seed loading service that validates and imports YAML world definitions into database