# Issue Details

**Date**: 2025-08-23  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature/Item System

## Description

For armor items, the "value" field will describe how many points of armor the character has. Armor points are subtracted from damage taken.

## Details

**What is needed?**
- For armor-type items, the "value" field represents armor points
- Armor points are the sum of the value of all armor the character is wearing
- Armor points are subtracted from damage taken

**Requirements:**
- Armor items use the "value" field for armor points
- Calculate total armor points from all equipped armor
- Subtract armor points from incoming damage

**Acceptance criteria:**
- [ ] Armor items can have value field set (e.g., leather armor with value=2 provides 2 armor points)
- [ ] Total armor points calculated from sum of all equipped armor values
- [ ] Armor points subtracted from damage taken

## Implementation Notes

This uses the same "value" field as weapons but for armor protection instead of damage bonus.

## Resolution

*To be filled when issue is resolved*