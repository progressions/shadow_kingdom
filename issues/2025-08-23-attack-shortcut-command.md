# Attack Shortcut Command

## Issue Details

**Date**: 2025-08-23  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature/Quality of Life

## Description

Implement a single-letter shortcut "a" for the attack command that automatically targets the only hostile character in the room, streamlining combat interactions.

## Details

**What is the problem/requirement?**
Currently, players must type the full "attack [character name]" command every time they want to attack, even when there's only one hostile character present. This becomes repetitive during combat encounters.

**What should happen instead?**
- Add "a" as a shortcut command for attack
- When typed alone ("a"), it should:
  - Check if there's exactly one hostile character (enemy) in the current room
  - If yes, automatically attack that character
  - If no hostile characters, show "There's nothing to attack here."
  - If multiple hostile characters, show "Multiple targets available. Please specify: attack [character name]"
- When typed with a target ("a goblin"), work exactly like "attack goblin"

**Acceptance Criteria:**
- [ ] "a" command registered as alias for "attack" 
- [ ] Single hostile auto-targeting works correctly
- [ ] Appropriate messages for 0, 1, or multiple hostile characters
- [ ] "a [target]" syntax works identically to "attack [target]"
- [ ] Respects existing combat mechanics (50% hit chance, damage values, etc.)
- [ ] Works with character sentiment system (only auto-targets hostile/aggressive characters)
- [ ] Full test coverage for all scenarios
- [ ] Command help updated to show "a" shortcut

## Technical Notes

**Implementation Approach:**
1. Add "a" as command alias in CommandRouter
2. Modify attack command handler to support auto-targeting logic
3. Query for hostile characters (sentiment = 'hostile' or 'aggressive') in current room
4. Implement target selection logic based on count
5. Maintain all existing attack mechanics

**Code Locations:**
- `src/gameController.ts` - Attack command handler
- `src/services/commandRouter.ts` - Command registration
- `src/services/characterService.ts` - Character queries

**Example Usage:**
```
> look
You see a goblin here, snarling menacingly.

> a
You attack the goblin for 2 damage!

---

> look  
You see a friendly merchant and an angry orc here.

> a
You attack the orc for 2 damage!

---

> look
You see two goblins here.

> a
Multiple targets available. Please specify: attack [character name]

> a goblin
You attack the goblin for 2 damage!
```

## Resolution

*To be filled when issue is resolved*

## Related

- `issues/simple-combat-system.md` - Base combat system
- `issues/2025-08-23-random-attack-mechanics.md` - Attack hit/miss mechanics
- `issues/2025-08-22-character-sentiment-system.md` - Character hostility determination