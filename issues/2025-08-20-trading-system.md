# Trading System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement a comprehensive trading system that allows players to buy and sell items with NPC merchants, featuring dynamic pricing, regional market variations, reputation effects, and an economy that responds to player actions.

## Details

**What is the requirement?**
Create a trading system with the following features:

- **Merchant NPCs**: Specialized traders with region-appropriate inventories
- **Dynamic Pricing**: Prices affected by supply/demand, reputation, and region
- **Currency System**: Gold, silver, copper pieces with exchange rates
- **Merchant Inventory**: Rotating stock with regular restocking
- **Haggling Mechanics**: Charisma-based price negotiation
- **Regional Markets**: Different goods and prices in each region type
- **Reputation Effects**: Player standing affects merchant interactions

**Acceptance criteria:**
- [ ] Currency system with gold/silver/copper pieces
- [ ] Merchant NPC generation with appropriate inventories
- [ ] `buy <item>` and `sell <item>` commands
- [ ] Dynamic pricing based on multiple factors
- [ ] `haggle` command for price negotiation
- [ ] Merchant inventory management and restocking
- [ ] Regional price variations and specialties
- [ ] Integration with reputation and relationship systems

## Technical Notes

### Currency System
```sql
-- Add to characters table
ALTER TABLE characters ADD COLUMN gold_pieces INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN silver_pieces INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN copper_pieces INTEGER DEFAULT 0;

-- Conversion rates: 1 gold = 10 silver = 100 copper
```

### Merchant System
```sql
CREATE TABLE merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  npc_id INTEGER NOT NULL,
  merchant_type TEXT NOT NULL, -- general, weapons, armor, magic, food
  specialization TEXT, -- region-specific goods
  gold_pieces INTEGER DEFAULT 100,
  buy_rate REAL DEFAULT 0.5, -- percentage of value merchants pay
  sell_markup REAL DEFAULT 2.0, -- multiplier for selling prices
  restocks_every INTEGER DEFAULT 24, -- hours between restocks
  last_restock DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE
);

CREATE TABLE merchant_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  base_price INTEGER NOT NULL, -- in copper pieces
  current_price INTEGER NOT NULL,
  restock_quantity INTEGER DEFAULT 1,
  max_stock INTEGER DEFAULT 5,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### Regional Merchant Types
```typescript
const REGIONAL_MERCHANTS = {
  mansion: {
    types: ['antique_dealer', 'art_collector', 'luxury_goods'],
    specialties: ['fine_art', 'jewelry', 'rare_books', 'vintage_items'],
    priceMultiplier: 1.5 // Higher prices for luxury items
  },
  forest: {
    types: ['herbalist', 'ranger_outfitter', 'druid_vendor'],
    specialties: ['healing_herbs', 'survival_gear', 'nature_items'],
    priceMultiplier: 1.0 // Standard pricing
  },
  cave: {
    types: ['gem_trader', 'mining_supplier', 'ore_merchant'],
    specialties: ['precious_gems', 'metal_ores', 'mining_tools'],
    priceMultiplier: 0.8 // Lower prices for raw materials
  },
  town: {
    types: ['general_store', 'weaponsmith', 'armorer', 'tavern_keeper'],
    specialties: ['basic_goods', 'weapons', 'armor', 'food_drink'],
    priceMultiplier: 1.2 // Standard town markup
  }
};
```

### Dynamic Pricing System
```typescript
interface PricingFactors {
  baseValue: number;
  supply: number; // how many merchant has in stock
  demand: number; // regional demand for item type
  reputation: number; // player's standing with merchant
  rarity: ItemRarity;
  regionMultiplier: number;
  merchantMarkup: number;
}

const calculateItemPrice = (item: Item, merchant: Merchant, player: Character, isBuying: boolean): number => {
  let price = item.base_value;
  
  // Supply and demand
  const stock = merchant.getItemStock(item.id);
  const supplyMultiplier = Math.max(0.5, Math.min(2.0, 5 / Math.max(1, stock)));
  
  // Reputation effect (±20%)
  const relationshipLevel = merchant.getRelationshipWith(player);
  const reputationMultiplier = 1.0 + (relationshipLevel / 500); // -0.2 to +0.2
  
  // Merchant type specialization
  const specializationMultiplier = merchant.specializesIn(item.type) ? 0.9 : 1.1;
  
  if (isBuying) {
    // Player buying from merchant
    price *= merchant.sell_markup;
    price *= supplyMultiplier;
    price *= reputationMultiplier;
    price *= merchant.region.priceMultiplier;
  } else {
    // Player selling to merchant
    price *= merchant.buy_rate;
    price *= (2 - supplyMultiplier); // inverse of supply effect
    price *= reputationMultiplier;
  }
  
  return Math.floor(price);
};
```

### Trading Commands
```typescript
'shop': async () => {
  // Find merchant in current room
  // Display merchant inventory with prices
  // Show player's currency
};

'buy <item> [quantity]': async (itemName: string, quantity: number = 1) => {
  // Find item in merchant inventory
  // Calculate total price
  // Check player funds
  // Transfer item and currency
  // Update merchant stock
};

'sell <item> [quantity]': async (itemName: string, quantity: number = 1) => {
  // Find item in player inventory
  // Calculate merchant offer
  // Check merchant funds
  // Transfer item and currency
  // Update inventories
};

'haggle': async () => {
  // Initiate haggling mini-game
  // Charisma-based skill check
  // Success improves price by 5-15%
  // Failure may worsen relationship
  // Limited attempts per merchant per day
};

'appraise <item>': async (itemName: string) => {
  // Show estimated value of item
  // Display what local merchants might pay
  // Accuracy based on player Intelligence
};
```

### Haggling System
```typescript
interface HagglingAttempt {
  basePrice: number;
  targetPrice: number; // what player wants to pay
  difficulty: number; // based on price difference
  charismaBonus: number;
  relationshipBonus: number;
  attemptsUsed: number;
  maxAttempts: number;
}

const processHaggle = (player: Character, merchant: Merchant, targetReduction: number): HagglingResult => {
  const charismaBonus = Math.floor((player.charisma - 10) / 2);
  const relationshipBonus = Math.floor(merchant.getRelationshipWith(player) / 20);
  
  const roll = Math.random() * 20 + charismaBonus + relationshipBonus;
  const difficulty = 10 + (targetReduction * 2); // Higher reductions are harder
  
  if (roll >= difficulty) {
    // Success - apply discount
    merchant.modifyRelationship(player, 1); // Small relationship boost
    return { success: true, newPrice: calculateDiscountedPrice(targetReduction) };
  } else {
    // Failure - merchant may be annoyed
    if (roll < difficulty - 5) {
      merchant.modifyRelationship(player, -1);
    }
    return { success: false, message: generateFailureMessage(merchant.personality) };
  }
};
```

### Implementation Areas
- **Trading Service**: Handle buy/sell transactions and pricing
- **Merchant AI**: Generate appropriate merchant inventories
- **Currency System**: Manage player and merchant funds
- **Pricing Engine**: Dynamic price calculation system
- **Haggling System**: Negotiation mechanics and outcomes

## Related

- Dependencies: NPC System, Inventory System, Item Discovery
- Enables: Economic gameplay, item acquisition, currency use
- Integration: Reputation system, regional specialization
- Future: Player shops, trade routes, economic simulation
- References: `specs/rpg-systems-comprehensive.md` Merchant Interactions section