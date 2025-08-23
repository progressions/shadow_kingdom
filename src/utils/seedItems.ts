/**
 * Seed Items for Shadow Kingdom
 * 
 * This file contains seed data for the item system, providing a basic set of items
 * for testing and initial gameplay. These items are created during database
 * initialization if the items table is empty.
 * 
 * Note: The "value" field serves dual purposes:
 * - For WEAPON items: Represents additional damage points added to attacks
 * - For other items: Represents monetary value in copper pieces
 */

import Database from './database';
import { ItemService } from '../services/itemService';
import { ItemType, EquipmentSlot, CreateItemData } from '../types/item';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';

/**
 * Seed item definitions - keeping it simple for initial implementation
 */
const SEED_ITEMS: CreateItemData[] = [
  {
    name: 'Iron Sword',
    description: 'A sturdy iron sword with a well-balanced blade. The metal gleams with a dull silver sheen.',
    type: ItemType.WEAPON,
    weight: 2.5,
    value: 1, // Adds 1 damage to attacks
    stackable: false,
    max_stack: 1,
    equipment_slot: EquipmentSlot.HAND
  },
  {
    name: 'Leather Armor',
    description: 'Well-crafted leather armor that provides protection while maintaining flexibility.',
    type: ItemType.ARMOR,
    weight: 8.0,
    value: 150,
    stackable: false,
    max_stack: 1,
    armor_rating: 2,
    equipment_slot: EquipmentSlot.BODY
  },
  {
    name: 'Health Potion',
    description: 'A glass vial filled with a shimmering red liquid that restores vitality.',
    type: ItemType.CONSUMABLE,
    weight: 0.5,
    value: 25,
    stackable: true,
    max_stack: 10
  },
  {
    name: 'Bread',
    description: 'A fresh loaf of bread, still warm and fragrant. Perfect for sustaining energy.',
    type: ItemType.CONSUMABLE,
    weight: 0.2,
    value: 5,
    stackable: true,
    max_stack: 20
  },
  {
    name: 'Gold Coins',
    description: 'Gleaming gold coins bearing the mark of the Shadow Kingdom.',
    type: ItemType.MISC,
    weight: 0.025,
    value: 1,
    stackable: true,
    max_stack: 1000
  },
  {
    name: 'Ancient Key',
    description: 'An ornate key made of tarnished brass, covered in intricate engravings.',
    type: ItemType.QUEST,
    weight: 0.1,
    value: 0,
    stackable: false,
    max_stack: 1
  },
  {
    name: 'Wooden Staff',
    description: 'A simple wooden staff, worn smooth by many hands. It hums faintly with magical energy.',
    type: ItemType.WEAPON,
    weight: 1.5,
    value: 0, // No additional damage (basic weapon)
    stackable: false,
    max_stack: 1,
    equipment_slot: EquipmentSlot.HAND
  },
  {
    name: 'Healing Herbs',
    description: 'A bundle of dried herbs known for their restorative properties.',
    type: ItemType.CONSUMABLE,
    weight: 0.1,
    value: 10,
    stackable: true,
    max_stack: 50
  },
  {
    name: 'Iron Helmet',
    description: 'A solid iron helmet that protects the head. The metal is dented from many battles.',
    type: ItemType.ARMOR,
    weight: 3.0,
    value: 75,
    stackable: false,
    max_stack: 1,
    armor_rating: 1,
    equipment_slot: EquipmentSlot.HEAD
  },
  {
    name: 'Leather Boots',
    description: 'Sturdy leather boots with thick soles, perfect for long journeys.',
    type: ItemType.ARMOR,
    weight: 2.0,
    value: 50,
    stackable: false,
    max_stack: 1,
    armor_rating: 1,
    equipment_slot: EquipmentSlot.FOOT
  },
  {
    name: 'Ancient Stone Pedestal',
    description: 'A weathered stone pedestal carved with mysterious runes that seem to shift in the corner of your eye. It stands firmly rooted to the floor.',
    type: ItemType.MISC,
    weight: 999,
    value: 0,
    stackable: false,
    max_stack: 1,
    is_fixed: true
  },
  {
    name: 'Cursed Ruby Ring',
    description: 'A beautiful ruby ring that glows with an ominous red light. The gem seems to pulse with malevolent energy.',
    type: ItemType.MISC,
    weight: 0.05,
    value: 200,
    stackable: false,
    max_stack: 1
  },
  {
    name: 'Blessed Silver Amulet',
    description: 'A silver amulet inscribed with holy symbols. It radiates warmth and comfort, providing protection from dark forces.',
    type: ItemType.MISC,
    weight: 0.1,
    value: 150,
    stackable: false,
    max_stack: 1
  },
  {
    name: 'Mysterious Glowing Orb',
    description: 'A smooth orb that glows with shifting colors. When you touch it, you feel a surge of magical energy coursing through your veins.',
    type: ItemType.MISC,
    weight: 0.5,
    value: 300,
    stackable: false,
    max_stack: 1
  },
  {
    name: 'Poisoned Dagger',
    description: 'A wickedly sharp dagger with a blade coated in a greenish substance. The poison glistens ominously in the light.',
    type: ItemType.WEAPON,
    weight: 1.0,
    value: 2, // Adds 2 damage due to poison
    stackable: false,
    max_stack: 1,
    equipment_slot: EquipmentSlot.HAND
  },
  {
    name: 'Scholar\'s Spectacles',
    description: 'Delicate wire-rimmed spectacles that belonged to an ancient scholar. They seem to enhance mental acuity and perception.',
    type: ItemType.MISC,
    weight: 0.1,
    value: 120,
    stackable: false,
    max_stack: 1
  },
  {
    name: 'Cursed Skull',
    description: 'A weathered human skull with glowing red eye sockets. Dark energy emanates from its hollow gaze, and you can hear faint whispers when near it.',
    type: ItemType.MISC,
    weight: 2,
    value: 50,
    stackable: false,
    max_stack: 1
  }
];

/**
 * Seed the items table with basic items if it's empty
 * @param db Database instance
 * @param tui Optional TUI interface for output
 */
export async function seedItems(db: Database, tui?: TUIInterface): Promise<void> {
  try {
    const itemService = new ItemService(db);
    
    // Check if items already exist
    const existingItems = await itemService.listItems();
    if (existingItems.length > 0) {
      if (tui) {
        tui.display(`Skipping item seeding - ${existingItems.length} items already exist`, MessageType.SYSTEM);
      }
      return;
    }

    if (tui) {
      tui.display('Seeding initial items...', MessageType.SYSTEM);
    }

    // Create seed items
    let createdCount = 0;
    for (const itemData of SEED_ITEMS) {
      try {
        const itemId = await itemService.createItem(itemData);
        createdCount++;
        
        if (tui) {
          tui.display(`Created item: ${itemData.name} (ID: ${itemId})`, MessageType.SYSTEM);
        }
      } catch (error) {
        if (tui) {
          tui.display(`Error creating item ${itemData.name}: ${error}`, MessageType.ERROR);
        }
        // Continue with other items even if one fails
      }
    }

    if (tui) {
      tui.display(`Successfully seeded ${createdCount} items`, MessageType.SYSTEM);
    }

  } catch (error) {
    if (tui) {
      tui.display(`Error seeding items: ${error}`, MessageType.ERROR);
    }
    throw error;
  }
}

/**
 * Get a specific seed item by name (useful for testing)
 * @param name Item name to find
 * @returns Seed item data or undefined
 */
export function getSeedItemByName(name: string): CreateItemData | undefined {
  return SEED_ITEMS.find(item => item.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all seed item definitions
 * @returns Array of all seed items
 */
export function getAllSeedItems(): CreateItemData[] {
  return [...SEED_ITEMS]; // Return a copy to prevent modification
}