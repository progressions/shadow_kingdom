# Companion Guide

## Overview
Companions are recruitable NPCs who follow the player, provide passive auras, and trigger special abilities during combat. Each companion has unique personality traits, visual appearance, and combat specializations. Effects scale with affinity (1-10).

### Party Rules and Conflicts (New)
- Level 2 Feud — Canopy ↔ Yorna:
  - On first entering Level 2 with both in party, a VN scene plays. You must choose which one stays; the other is dismissed (same as using Dismiss).
  - While the feud is unresolved, they refuse to join if the rival is currently in the party. This leaves one open slot and nudges you to recruit Oyin or Twil.
  - Later content can grant `canopy_yorna_respect` (a truce), allowing both to ride together again.
- Strategy signal: The Level 2 boss (Nethra) applies −1 melee range; Oyin’s +1 range aura cancels it, and Twil’s slows reduce gust pressure. This teaches party counter‑picking.

### Address Styles (Summary)
| Companion  | How They Address You |
|------------|-----------------------|
| Canopy     | My Lord               |
| Yorna      | Chief                 |
| Hola       | My Lord               |
| Oyin       | My Lord               |
| Twil       | Master                |
| Tin        | My Lord               |
| Nellis     | Sire                  |
| Urn        | Mister                |
| Varabella  | Boss man              |
| Cowsill    | My Lord               |
| Fana       | My Prince             |

---

## Level 1: Forest

### Canopy
**Appearance:** Blonde hair, blue dress  
**Personality:** Calm healer, protective, searching for her sister Ell  
**Class:** Support/Healer  
**Address:** “My Lord”  

**Auras:**
- Damage Reduction: +1 DR
- Regeneration: +0.2 HP/sec

**Triggers:**
- **Shield**: Activates at 40% HP, lasts 6 seconds (12s cooldown)
- **Dash Mend (Affinity 5+)**: When you dash, heal 1 HP (6s cooldown)

**Quest Line:** Finding clues about her missing sister across multiple levels

---

### Yorna  
**Appearance:** Red hair, black dress  
**Personality:** Ruthless fighter, confident, aggressive  
**Class:** Warrior/DPS  
**Address:** “Chief”  

**Auras:**
- Attack Damage: +1 ATK
- Attack Range: +2 pixels

**Triggers:**
- **Echo Strike**: 50% bonus damage on player hits (1.2s cooldown, scales with affinity)

**Quest Line:** Combat challenges and proving strength

---

### Hola
**Appearance:** Black hair, white dress  
**Personality:** Nervous sorceress, trying to remember spells, needs encouragement  
**Class:** Crowd Control/Support  
**Address:** “My Lord”  

**Auras:**
- Enemy Slow: 20% in 48px radius around player
- Touch Damage Reduction: +1 DR vs contact damage

**Triggers:**
- **Gust**: Pushes enemies 14px away, applies 25% slow for 0.4s (10s cooldown)

**Quest Line:** Spell practice and confidence building

---

## Level 2: Desert/Cave

### Oyin
**Appearance:** Blonde hair, green dress  
**Personality:** Young traveler, eager but inexperienced, wants to help  
**Class:** Support  
**Address:** “My Lord”  

**Auras:**
- Attack Range: +1 pixel
- Keen Timing: small crit chance (+5%)

**Triggers:**
- **Rally**: When HP < 60%, heals 2 HP and grants +1 ATK for 3 seconds (8s cooldown)

**Quest Line:** Learning to be brave and helpful

---

### Twil
**Appearance:** Red hair, black dress  
**Personality:** Quick scout, cocky, reads terrain well  
**Class:** Tactical/Debuff  
**Address:** “Master”  

**Auras:**
- Enemy Slow: 15% in 42px radius around player
- Damage Reduction: +1 DR
- Keen Edge: small crit chance (+5%)

**Triggers:**
- **Dust Veil**: When 2+ enemies are within 60px, applies 40% slow to all nearby enemies for 0.8 seconds (6s cooldown)

**Quest Line:** Scouting missions and tracking

---

### Level 2: Party Conflict — Canopy vs Yorna
- Trigger: Enter Level 2 with both Canopy and Yorna; a VN scene plays where they clash over approach (protection vs aggression).
- Choice: Keep Canopy or Keep Yorna. The unchosen one is dismissed immediately.
- Rule: Until a later truce (`canopy_yorna_respect`), Canopy will not join if Yorna is in the party, and vice‑versa.
- Intent: Leave one slot open to encourage recruiting Oyin and/or Twil; both offer strong counters to Nethra’s kit (range penalty + gust windows).
- Affinity: Dismissing Yorna applies a larger negative affinity (−1.0). Dismissing Canopy applies a smaller negative affinity (−0.6). The penalty is preserved if you re‑recruit them later.

---

## Level 3: Marsh

### Tin
**Appearance:** Blue hair, blue dress  
**Personality:** Hyperactive, enthusiastic, always moving  
**Class:** Speed/Agility  
**Address:** “My Lord”  

**Auras:**
- Attack Speed: +12% (reduces attack cooldown)

**Triggers:**
- **Slipstream**: Pushes enemies 10px away, applies 15% slow for 0.4s, grants +2 range for 2 seconds (10s cooldown)
- **Tumble Up**: After taking damage, heals 1 HP and grants +1 ATK for 3 seconds (7s cooldown)

**Quest Line:** Speed challenges and races

---

### Nellis
**Appearance:** Purple hair, white dress  
**Personality:** Steady, mourning past losses, reliable  
**Class:** Tank/Defense  
**Address:** “Sire”  

**Auras:**
- Damage Reduction: +1 DR (constant)

**Triggers:**
- **Mourner's Veil**: When 3+ enemies are within 80px, applies 35% slow to all enemies in range for 1 second (5s cooldown)
- **Beacon**: When enemies are within 100px, grants +2 range for 3 seconds (9s cooldown)
- **Keep the Line**: When HP < 40%, grants +1 DR and applies 20% slow to nearby enemies for 4 seconds (12s cooldown)

**Quest Line:** Honoring the fallen and protecting others

---

## Level 4: Ruined City

### Urn
**Appearance:** Green hair, green dress  
**Personality:** Positive, hopeful, keeps spirits up  
**Class:** Support/Healer  
**Address:** “Mister”  

**Auras:**
- Regeneration: +0.1 HP/sec

**Triggers:**
- **Cheer**: Burst heal 3 HP in 80px radius when player HP < 50% and briefly speeds up your attacks (noticeable aspd boost for ~3.5s; 12s cooldown)

**Quest Line:** Securing safe paths through the ruins

---

### Varabella
**Appearance:** Red hair, black dress  
**Personality:** Tactical, sharp-eyed, precise  
**Class:** Precision/Buff  
**Address:** “Boss man”  

**Auras:**
- Attack Range: +1 pixel
- Sharp Eye: small crit chance (+5%)

**Triggers:**
- **Call the Angle**: When enemies within 140px, grants +1 ATK and +2 range for 3s (9s cooldown)

**Quest Line:** Strategic positioning and angles

---

## Level 5: Temple District

### Cowsill
**Appearance:** Blonde hair, black dress  
**Personality:** Energetic striker, positive, trained with temple guards  
**Class:** Striker/DPS  
**Address:** “My Lord”  

**Auras:**
- Attack Damage: +2 ATK (highest base attack boost)
- Attack Speed: +15% faster attacks

**Triggers:**
- **Strike Synergy**: 75% bonus damage on player hits (0.8s cooldown)
- **Double Strike**: 20% chance for 150% damage follow-up with yellow sparkles (3s cooldown)

**Quest Line:** Temple Strike Team - clearing corrupted guards and purifying sacred spaces

---

## Affinity Scaling

All companion effects scale with affinity (relationship level):
- **Base (Affinity 1)**: 100% effectiveness
- **Max (Affinity 10)**: 150% effectiveness

The scaling formula: `multiplier = 1 + ((affinity - 1) / 9) * 0.5`

This affects:
- Aura strength (capped by global limits)
- Trigger damage/healing amounts
- Trigger cooldown reduction
- Trigger proc chances

---

## Global Buff Caps

To maintain game balance, companion buffs have maximum stack limits:
- **Attack**: +2 max
- **Damage Reduction**: +2 max  
- **Regeneration**: +0.4 HP/sec max
- **Range**: +3 pixels max
- **Touch DR**: +1 max
- **Slow**: 25% max
- **Attack Speed**: +50% max
- **Crit Chance (from auras)**: +15% max

---

## Companion Synergies

Some companions work especially well together:
- **Canopy + Urn**: Double healing for maximum survivability
- **Yorna + Cowsill**: Stacked damage bonuses for devastating strikes
- **Hola + Twil**: Layered slowing effects for crowd control
- **Nellis + Canopy**: Maximum damage reduction and shields

---

## Quest Progression

Each companion has multi-level quest chains that:
1. Start with simple tasks in their recruitment level
2. Expand with new challenges as you reach new areas
3. Reward affinity points for completion
4. Unlock special dialog and bond conversations at high affinity (6+, 8+, 9.5+)
