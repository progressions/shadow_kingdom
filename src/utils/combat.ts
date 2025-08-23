/**
 * Combat utility functions for Shadow Kingdom
 * 
 * Provides unified attack calculation system used by both player and enemy attacks.
 * Uses D20 rolls with strength and dexterity modifiers.
 */

/**
 * Calculate attribute modifier from raw attribute value
 * Converts attribute (1-20 range) to modifier (-3 to +3 range)
 * 
 * @param stat - Raw attribute value (1-20)
 * @returns Modifier value (-3 to +3)
 * 
 * Modifier distribution:
 * - Stats 1-3: -3 modifier
 * - Stats 4-6: -2 modifier  
 * - Stats 7-9: -1 modifier
 * - Stats 10-12: 0 modifier
 * - Stats 13-15: +1 modifier
 * - Stats 16-18: +2 modifier
 * - Stats 19-20: +3 modifier
 */
export function calculateAttributeModifier(stat: number): number {
  return Math.floor((stat - 10) / 3);
}

/**
 * Attack result details for displaying combat information
 */
export interface AttackResult {
  hits: boolean;
  d20Roll: number;
  strengthModifier: number;
  attackRoll: number;
  dexterityModifier: number;
  targetNumber: number;
}

/**
 * Determine if an attack hits using D20 system with detailed results
 * 
 * @param attackerStrength - Attacker's strength attribute (1-20)
 * @param defenderDexterity - Defender's dexterity attribute (1-20)
 * @returns AttackResult with detailed calculation information
 * 
 * Mechanics:
 * - Roll 1d20 + strength modifier
 * - Target number is 10 + defender's dexterity modifier
 * - Attack hits if roll >= target number
 */
export function calculateAttack(attackerStrength: number, defenderDexterity: number): AttackResult {
  const d20Roll = Math.floor(Math.random() * 20) + 1; // 1d20
  const strengthModifier = calculateAttributeModifier(attackerStrength);
  const dexterityModifier = calculateAttributeModifier(defenderDexterity);
  
  const attackRoll = d20Roll + strengthModifier;
  const targetNumber = 10 + dexterityModifier;
  
  return {
    hits: attackRoll >= targetNumber,
    d20Roll,
    strengthModifier,
    attackRoll,
    dexterityModifier,
    targetNumber
  };
}

/**
 * Determine if an attack hits using D20 system (legacy function for backward compatibility)
 * 
 * @param attackerStrength - Attacker's strength attribute (1-20)
 * @param defenderDexterity - Defender's dexterity attribute (1-20)
 * @returns true if attack hits, false if it misses
 */
export function doesAttackHit(attackerStrength: number, defenderDexterity: number): boolean {
  return calculateAttack(attackerStrength, defenderDexterity).hits;
}