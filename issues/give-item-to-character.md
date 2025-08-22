# Give Item to Character

## Feature Request
Implement a "give" command that allows players to give items from their inventory to NPCs in the game.

## User Story
As a player, I want to give items to NPCs so that I can interact with characters and potentially complete quests or trade items.

## Acceptance Criteria
- [ ] Player can use command syntax: `give [item] to [character]`
- [ ] Item is removed from player's inventory upon successful transfer
- [ ] Character responds with "Thank you." when receiving an item
- [ ] Clear error messages for invalid scenarios (no such item, no such character)
- [ ] Partial name matching works for both items and characters

## Examples
```
give gold to troll
> You give the gold coin to the Troll.
> Troll says, "Thank you."

give sword to ogre
> You give the iron sword to the Ogre.
> Ogre says, "Thank you."

give hat to squirrel
> You give the wizard hat to the Squirrel.
> Squirrel says, "Thank you."
```

## Implementation Notes
- No need to track items in character inventory (just remove from player)
- Use existing character inventory schema if needed for future enhancements
- Character response format: `[Character Name] says, "Thank you."`

## Technical Specification
See detailed implementation plan at: `/specs/give-item-feature.md`

## Priority
Medium - This is a core interaction feature that enhances gameplay but is not blocking other functionality.

## Related Issues
- Character dialogue system (completed)
- Inventory management system (existing)