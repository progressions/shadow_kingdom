# Locked Connections

**Date**: 2025-08-23  
**Status**: Completed  
**Priority**: Medium  
**Category**: Feature/World System

## Description

Add locked connections that require specific keys to pass through, adding puzzle and progression mechanics to room navigation.

## Requirements

### Database Schema
- Add `locked` BOOLEAN field to connections table (default FALSE)
- Add `required_key_name` TEXT field to connections table for key matching

### Gameplay Mechanics
- Locked connections block movement with message: "This passage is locked. You need a [key name] to pass."
- When player has required key, allow movement through locked connection
- Keys remain in inventory after use (reusable)
- Use partial name matching for key requirements

### Implementation
- Update movement logic to check `locked` status and `required_key_name`
- Query player inventory for required key item
- Display appropriate success/failure messages

## Acceptance Criteria
- [x] Database schema supports locked connections with key requirements
- [x] Movement blocked when connection is locked and player lacks key
- [x] Movement allowed when player has required key
- [x] Clear error messages for locked passages
- [x] Keys are reusable (not consumed on use)
- [x] Works with existing connection and movement systems

## Examples
```
> go north
This passage is locked. You need an Iron Key to pass.

> pickup iron key
You take the Iron Key.

> go north  
You unlock the passage with the Iron Key and go north.
```