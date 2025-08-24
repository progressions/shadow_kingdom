# Remove Non-Prisma Database Interactions

**Date:** 2025-08-24
**Priority:** High
**Category:** Backend

## Description

The codebase currently contains database interactions that bypass Prisma ORM. According to the CLAUDE.md requirements, ALL database access must use Prisma only. This creates inconsistency, potential maintenance issues, and violates the established architectural patterns.

## Steps to Reproduce

1. Search for direct SQL queries or legacy database wrapper usage
2. Look for patterns like `this.db.get()`, `this.db.run()`, or raw SQL strings
3. Identify any database operations not using `this.prismaService`

## Expected Behavior

- All database operations should go through Prisma ORM
- No direct SQL queries should exist in the codebase
- Consistent database access patterns across all services

## Actual Behavior

- Mixed database access patterns exist
- Some operations use direct SQL instead of Prisma
- Inconsistent with architectural requirements

## Related Files

- `src/services/` - All service files that interact with database
- `src/utils/initDb.ts` - Database initialization and schema
- Any files containing `this.db.` patterns
- Files with SQL query strings

## Screenshots

N/A

## Investigation Notes

From CLAUDE.md:
```
**⚠️ MANDATORY: ALL DATABASE ACCESS MUST USE PRISMA ONLY**

Every single database operation MUST go through Prisma ORM. No exceptions. Do not create legacy SQL-based services.

// ✅ CORRECT - Use Prisma services only
const room = await this.prismaService.room.findFirst({ where: { id: roomId } });

// ❌ FORBIDDEN - Direct SQL or legacy database wrappers
const room = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);
```

This issue requires:
1. Audit all database interactions in the codebase
2. Convert legacy SQL patterns to Prisma equivalents
3. Remove any direct database wrapper usage
4. Ensure all services use `this.prismaService` consistently
5. Update any remaining database initialization or migration code