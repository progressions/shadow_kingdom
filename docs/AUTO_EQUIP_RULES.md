Auto‑Equip Rules (Spec)

Scope
- Applies to two entry points:
  - On pickup auto‑equip (runtime convenience)
  - Programmatic calls to `autoEquipIfBetter(actor, slot)`
- Only evaluates non‑stackable items (stackables like torches are excluded unless explicitly equipped by the user via the UI).

Stat comparison
- Right hand (weapons): primary ATK, secondary DR
- Left hand (shields/tools): primary DR, secondary ATK
- Armor (head/torso/legs): DR only
- “Better” means strictly greater by primary, or if tied, strictly greater by secondary. Ties keep current item.

Hand rules
1) Both hands empty
   - Auto‑equip any non‑stackable item into its natural slot:
     - Weapon (1H) → rightHand
     - Weapon (2H: bow/greatsword) → rightHand (occupies both)
     - Shield/buckler → leftHand
     - Armor → its armor slot

2) Right hand has a weapon; left hand empty
   - If a two‑handed weapon is encountered and its stats are better than the current right‑hand weapon, auto‑equip it to rightHand (it will occupy both hands).

3) Right hand has a weapon; left hand has a shield
   - Auto‑equip a one‑handed sword/weapon to rightHand only if it is strictly better by the weapon scoring rules.

4) Right hand has a weapon; left hand has a shield
   - Auto‑equip a shield/buckler to leftHand only if it is strictly better by the shield scoring rules.

5) Torches (left hand)
   - Never auto‑equip a torch over anything already in the left hand (shield, buckler, tool, etc.). Torches equip only by explicit user action.

6) Armor
   - Auto‑equip armor to an armor slot if that slot is empty, or if the new piece has strictly better DR.

Two‑handed enforcement
- A two‑handed right‑hand weapon (e.g., bow, greatsword):
  - Blocks auto‑equip of new left‑hand items.
  - If auto‑equipped (per rule 2), leftHand must be empty.
  - Manual equip may free the left hand (shield returns to backpack; a lit torch is consumed), but auto‑equip does not overwrite a non‑empty left hand.

Exclusions & safety
- Do not auto‑equip stackable items (e.g., torches, ammo) on pickup.
- Do not auto‑equip two‑handed weapons from pickup when left hand is occupied; require manual confirmation via UI.

Notes for implementers
- Pickup flow should call `autoEquipIfBetter` only after filtering out torches and two‑handed weapons that would violate current left‑hand occupancy.
- `autoEquipIfBetter` should refuse candidates that violate the two‑handed/left‑hand constraints and should never consider torches.

