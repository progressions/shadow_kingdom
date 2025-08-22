import Database from '../utils/database';
import { GrokClient, RegionGenerationContext, GeneratedCharacter } from '../ai/grokClient';
import { Room, Connection, UnfilledConnection } from './gameStateManager';
import { RegionService } from './regionService';
import { Region } from '../types/region';
import { ItemGenerationService } from './itemGenerationService';
import { ItemService } from './itemService';
import { CharacterGenerationService } from './characterGenerationService';
import { FantasyLevelService } from './fantasyLevelService';
import { FantasyLevel } from '../types/fantasy';

export interface RoomGenerationOptions {
  enableDebugLogging?: boolean;
}

export interface RoomGenerationContext {
  gameId: number;
  fromRoomId: number;
  direction: string;
  theme?: string;
}

export interface RoomGenerationResult {
  success: boolean;
  roomId?: number;
  connectionId?: number;
  error?: Error;
}

export interface GenerationLimits {
  maxRoomsPerGame: number;
  maxGenerationDepth: number;
  minGenerationPerTrigger: number;
  generationCooldownMs: number;
}

/**
 * RoomGenerationService handles core room and connection generation logic.
 * Responsible for AI-powered room creation and connection management.
 * Background generation is handled by BackgroundGenerationService.
 */
export class RoomGenerationService {
  private options: RoomGenerationOptions;

  constructor(
    private db: Database,
    private grokClient: GrokClient,
    private regionService: RegionService,
    private itemGenerationService: ItemGenerationService,
    private characterGenerationService: CharacterGenerationService,
    private fantasyLevelService: FantasyLevelService,
    options: RoomGenerationOptions = {}
  ) {
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }




  /**
   * Generate a single room and connection in a specific direction
   */
  async generateSingleRoom(context: RoomGenerationContext): Promise<RoomGenerationResult> {
    try {
      // Check if a connection already exists for this direction to prevent duplicates
      const existingConnection = await this.db.get(
        'SELECT id FROM connections WHERE from_room_id = ? AND direction = ? AND game_id = ?',
        [context.fromRoomId, context.direction, context.gameId]
      );
      
      if (existingConnection) {
        return { 
          success: false, 
          error: new Error('Connection already exists') 
        };
      }

      const fromRoom = await this.db.get<any>('SELECT * FROM rooms WHERE id = ?', [context.fromRoomId]);

      // Determine region assignment using RegionService
      let regionId: number;
      let regionDistance: number;

      if (fromRoom.region_id && fromRoom.region_distance !== null) {
        // Check if we should create a new region or continue in current one
        const shouldCreateNewRegion = await this.regionService.shouldCreateNewRegion(fromRoom.region_distance, fromRoom.region_id);
        
        if (shouldCreateNewRegion) {
          // Generate new region with AI
          const existingRegions = await this.regionService.getRegionsForGame(context.gameId);
          const regionContext: RegionGenerationContext = {
            gameId: context.gameId,
            transitionFrom: {
              room: {
                name: fromRoom.name,
                description: fromRoom.description
              },
              region: existingRegions.find(r => r.id === fromRoom.region_id)
            },
            existingRegions: existingRegions.map(r => r.name || r.type)
          };

          const generatedRegion = await this.grokClient.generateRegion(regionContext);
          const newRegion = await this.regionService.createRegion(
            context.gameId,
            generatedRegion.type,
            generatedRegion.description,
            generatedRegion.name
          );
          
          regionId = newRegion.id;
          regionDistance = this.regionService.generateRegionDistance(); // 2-7
          
          if (this.isDebugEnabled()) {
            console.log(`🏛️ Created new region: ${generatedRegion.name} (${generatedRegion.type}) at distance ${regionDistance}`);
          }
        } else {
          // Continue in current region, increase distance
          regionId = fromRoom.region_id;
          regionDistance = fromRoom.region_distance + 1;
          
          if (this.isDebugEnabled()) {
            console.log(`📍 Continuing in region ${regionId} at distance ${regionDistance}`);
          }
        }
      } else {
        // From room has no region - create new one
        const regionContext: RegionGenerationContext = {
          gameId: context.gameId,
          transitionFrom: {
            room: {
              name: fromRoom.name,
              description: fromRoom.description
            }
          }
        };

        const generatedRegion = await this.grokClient.generateRegion(regionContext);
        const newRegion = await this.regionService.createRegion(
          context.gameId,
          generatedRegion.type,
          generatedRegion.description,
          generatedRegion.name
        );
        
        regionId = newRegion.id;
        regionDistance = this.regionService.generateRegionDistance();
        
        if (this.isDebugEnabled()) {
          console.log(`🏛️ Created first region: ${generatedRegion.name} (${generatedRegion.type})`);
        }
      }

      // Build regional context for room generation
      const region = await this.regionService.getRegion(regionId);
      if (!region) {
        throw new Error('Failed to retrieve region for room generation');
      }

      const regionContext = {
        region,
        isCenter: regionDistance === 0,
        distanceFromCenter: regionDistance
      };

      const adjacentDescriptions = await this.regionService.getAdjacentRoomDescriptions(context.fromRoomId);
      const enhancedPrompt = await this.regionService.buildRoomGenerationPrompt(regionContext, adjacentDescriptions);

      // Get existing room names for context
      const existingRooms = await this.db.all(
        'SELECT name FROM rooms WHERE game_id = ? ORDER BY id',
        [context.gameId]
      );
      const roomNames = existingRooms.map(room => room.name);

      // Select fantasy level for balanced room generation
      const fantasyLevelContext = this.fantasyLevelService.getFantasyLevelContext(region.type);
      
      if (this.isDebugEnabled()) {
        console.log(`🎭 Selected fantasy level: ${fantasyLevelContext.level} for region type: ${region.type}`);
      }

      // Generate room with enhanced regional context and fantasy level
      const newRoom = await this.grokClient.generateRoom({
        currentRoom: { name: fromRoom.name, description: fromRoom.description },
        direction: context.direction,
        gameHistory: roomNames,
        theme: enhancedPrompt, // Use the regional prompt as theme
        fantasyLevel: fantasyLevelContext.level
      });

      // Check for duplicate room names and make unique if needed
      let uniqueName = newRoom.name;
      let counter = 1;
      
      while (true) {
        const existingRoom = await this.db.get(
          'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
          [context.gameId, uniqueName]
        );
        
        if (!existingRoom) {
          break; // Name is unique
        }
        
        // Add counter to make name unique
        uniqueName = `${newRoom.name} ${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 100) {
          uniqueName = `${newRoom.name} ${Date.now()}`;
          break;
        }
      }

      // Save to database with region assignment
      const roomResult = await this.db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [context.gameId, uniqueName, newRoom.description, regionId, regionDistance]
      );

      // Generate items for the room if AI provided them
      if (this.isDebugEnabled()) {
        console.log(`🔍 Room generation result has ${newRoom.items?.length || 0} items`);
      }
      
      // Always create some items based on the room, even if AI didn't provide them
      let itemsToCreate = newRoom.items || [];
      
      // If no items from AI and item generation is enabled, create some based on the description
      if (itemsToCreate.length === 0 && process.env.AI_ITEM_GENERATION_ENABLED !== 'false') {
        // Simple keyword-based item generation
        const description = newRoom.description.toLowerCase();
        
        // Look for common objects in the description
        if (description.includes('forge') || description.includes('anvil')) {
          itemsToCreate.push({
            name: 'Ancient Hammer',
            description: 'A heavy smithing hammer, worn from centuries of use.',
            isFixed: false
          });
        }
        if (description.includes('crystal') || description.includes('glow')) {
          itemsToCreate.push({
            name: 'Glowing Crystal',
            description: 'A softly glowing crystal that pulses with inner light.',
            isFixed: false
          });
        }
        if (description.includes('altar') || description.includes('pedestal')) {
          itemsToCreate.push({
            name: 'Stone Altar',
            description: 'An ancient altar carved from dark stone.',
            isFixed: true
          });
        }
        if (description.includes('chains') || description.includes('shackles')) {
          itemsToCreate.push({
            name: 'Iron Chains',
            description: 'Heavy iron chains that rattle ominously.',
            isFixed: true
          });
        }
        if (description.includes('tome') || description.includes('book')) {
          itemsToCreate.push({
            name: 'Dusty Tome',
            description: 'An ancient book filled with cryptic writings.',
            isFixed: false
          });
        }
        
        if (this.isDebugEnabled() && itemsToCreate.length > 0) {
          console.log(`🎲 Generated ${itemsToCreate.length} fallback items based on room description`);
        }
      }
      
      // Create the items in the database
      if (itemsToCreate.length > 0) {
        await this.itemGenerationService.createItemsFromRoomGeneration(
          roomResult.lastID as number,
          itemsToCreate
        );
      }

      // Create characters in the database if AI provided them, or generate fallback characters
      let charactersToCreate = newRoom.characters || [];
      
      // If no characters from AI and character generation is enabled, create some based on the description
      if (charactersToCreate.length === 0 && process.env.AI_CHARACTER_GENERATION_ENABLED !== 'false') {
        charactersToCreate = this.generateFallbackCharacters(newRoom.name, newRoom.description);
      }
      
      if (this.isDebugEnabled()) {
        console.log(`🧙 Room generation result has ${charactersToCreate.length} characters (${newRoom.characters?.length || 0} from AI, ${charactersToCreate.length - (newRoom.characters?.length || 0)} fallback)`);
      }
      
      if (charactersToCreate.length > 0) {
        try {
          await this.characterGenerationService.createCharactersFromRoomGeneration(
            context.gameId,
            roomResult.lastID as number,
            charactersToCreate
          );
        } catch (error) {
          // Log but don't fail room generation if character creation fails
          if (this.isDebugEnabled()) {
            console.error('Failed to create characters for room:', error);
          }
        }
      }

      // Find the AI-generated thematic name for the outgoing connection
      let outgoingThematicName = context.direction; // fallback to basic direction
      let returnThematicName = this.getReverseDirection(context.direction) || 'back';
      
      // Look for AI-generated connection descriptions
      if (newRoom.connections && newRoom.connections.length > 0) {
        // Find the return path connection for thematic naming
        const returnConnection = newRoom.connections.find(c => 
          c.direction === this.getReverseDirection(context.direction)
        );
        
        if (returnConnection) {
          returnThematicName = returnConnection.name;
          // Create a complementary thematic name for the outgoing connection
          outgoingThematicName = this.generateComplementaryConnectionName(returnConnection.name, context.direction);
        }
      }

      // Create outgoing connection from origin room with thematic name
      const connectionResult = await this.db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [context.gameId, context.fromRoomId, roomResult.lastID, context.direction, outgoingThematicName]
      );

      // Create AI-generated connections from the new room
      if (newRoom.connections && newRoom.connections.length > 0) {
        for (const connection of newRoom.connections) {
          // Find if this connection leads back to the origin room
          const isReturnPath = connection.direction === this.getReverseDirection(context.direction);
          
          if (isReturnPath) {
            // Create the return connection with thematic name
            await this.db.run(
              'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
              [context.gameId, roomResult.lastID, context.fromRoomId, connection.direction, connection.name]
            );
          } else {
            // Create unfilled connection for future background generation
            await this.db.run(
              'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
              [context.gameId, roomResult.lastID, null, connection.direction, connection.name]
            );
            
            if (this.isDebugEnabled()) {
              console.log(`🔗 Created unfilled connection: ${connection.name} (${connection.direction})`);
            }
          }
        }
      } else {
        // Fallback: ensure new room has at least one exit (back to where we came from)
        const reverseDirection = this.getReverseDirection(context.direction);
        if (reverseDirection) {
          await this.db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
            [context.gameId, roomResult.lastID, context.fromRoomId, reverseDirection, returnThematicName]
          );
        }
      }

      // Only show generation messages in debug mode
      if (this.isDebugEnabled()) {
        console.log(`✨ Generated new area: ${uniqueName} (${context.direction})`);
      }
      
      return { 
        success: true, 
        roomId: roomResult.lastID as number,
        connectionId: connectionResult.lastID as number
      };

    } catch (error) {
      // Silent failure - this is background generation
      if (this.isDebugEnabled()) {
        console.error(`Failed to generate room ${context.direction} from ${context.fromRoomId}:`, error);
      }
      return { 
        success: false, 
        error: error as Error 
      };
    }
  }

  /**
   * Generate fallback characters based on room name and description keywords
   */
  private generateFallbackCharacters(roomName: string, roomDescription: string): GeneratedCharacter[] {
    const characters: GeneratedCharacter[] = [];
    
    // Check generation rate - don't generate fallback characters in every room
    const generationRate = parseFloat(process.env.AI_CHARACTER_GENERATION_RATE || '0.3');
    if (Math.random() > generationRate) {
      return characters;
    }
    
    const nameAndDesc = (roomName + ' ' + roomDescription).toLowerCase();
    
    // Library/Study themed rooms
    if (nameAndDesc.match(/\b(library|study|archive|tome|book|scholar|manuscript)\b/)) {
      characters.push({
        name: 'Ancient Librarian',
        description: 'A ghostly figure in scholarly robes, tending to ethereal tomes',
        type: 'npc',
        personality: 'Scholarly and mysterious',
        initialDialogue: 'Seek you knowledge from ages past?',
        attributes: { intelligence: 15, wisdom: 13 }
      });
    }
    
    // Garden/Nature themed rooms
    else if (nameAndDesc.match(/\b(garden|grove|forest|tree|flower|vine|natural|bloom)\b/)) {
      characters.push({
        name: 'Garden Keeper',
        description: 'A spectral groundskeeper who tends to otherworldly plants',
        type: 'npc',
        personality: 'Gentle and protective',
        initialDialogue: 'These gardens hold secrets older than memory...',
        attributes: { wisdom: 14, constitution: 12 }
      });
    }
    
    // Kitchen/Dining themed rooms
    else if (nameAndDesc.match(/\b(kitchen|dining|cook|feast|meal|food|pantry|hearth)\b/)) {
      characters.push({
        name: 'Phantom Cook',
        description: 'The spirit of a master chef, still preparing spectral meals',
        type: 'npc',
        personality: 'Passionate and welcoming',
        initialDialogue: 'Welcome! You must try my latest creation!',
        attributes: { dexterity: 13, charisma: 12 }
      });
    }
    
    // Armory/Weapon themed rooms
    else if (nameAndDesc.match(/\b(armory|weapon|sword|shield|blade|guard|training|martial)\b/)) {
      characters.push({
        name: 'Weapons Master',
        description: 'An ancient warrior spirit bound to protect these arms',
        type: 'enemy',
        level: 3,
        isHostile: false,
        attributes: { strength: 15, dexterity: 13 }
      });
    }
    
    // Hall/Throne/Grand rooms
    else if (nameAndDesc.match(/\b(hall|throne|grand|royal|court|ceremonial|chamber|ballroom)\b/)) {
      characters.push({
        name: 'Spectral Courtier',
        description: 'A ghostly noble in faded finery, eternally attending court',
        type: 'npc',
        personality: 'Formal and nostalgic',
        initialDialogue: 'Ah, a visitor to our eternal court!',
        attributes: { charisma: 14, intelligence: 12 }
      });
    }
    
    // Observatory/Tower/High places
    else if (nameAndDesc.match(/\b(observatory|tower|high|peak|spire|watch|lookout|star)\b/)) {
      characters.push({
        name: 'Star Watcher',
        description: 'A robed figure studying the movements of celestial bodies',
        type: 'npc',
        personality: 'Contemplative and wise',
        initialDialogue: 'The stars tell of your coming...',
        attributes: { intelligence: 16, wisdom: 14 }
      });
    }
    
    // Dungeon/Prison/Dark places
    else if (nameAndDesc.match(/\b(dungeon|prison|cell|chain|captive|dark|shadow|crypt)\b/)) {
      characters.push({
        name: 'Tormented Spirit',
        description: 'A restless soul trapped in this place of sorrow',
        type: 'npc',
        personality: 'Melancholic and warning',
        initialDialogue: 'Turn back... this place holds only despair...',
        attributes: { wisdom: 13, charisma: 8 }
      });
    }
    
    // Workshop/Craft rooms
    else if (nameAndDesc.match(/\b(workshop|forge|craft|anvil|hammer|tool|smith|work)\b/)) {
      characters.push({
        name: 'Master Craftsman',
        description: 'The ghost of a skilled artisan, forever working at their trade',
        type: 'npc',
        personality: 'Focused and proud',
        initialDialogue: 'Behold the work of a true master!',
        attributes: { strength: 13, dexterity: 15 }
      });
    }
    
    // Bedroom/Private quarters
    else if (nameAndDesc.match(/\b(bedroom|chamber|private|personal|bed|sleep|rest|quarter)\b/)) {
      characters.push({
        name: 'Restless Occupant',
        description: 'The former inhabitant of this room, unable to find peace',
        type: 'npc',
        personality: 'Tired and melancholic',
        initialDialogue: 'So long since I\'ve had a visitor...',
        attributes: { charisma: 11, wisdom: 12 }
      });
    }
    
    if (this.isDebugEnabled() && characters.length > 0) {
      console.log(`🎲 Generated ${characters.length} fallback characters based on room keywords`);
    }
    
    return characters;
  }

  /**
   * Get the reverse direction for a given direction
   */
  getReverseDirection(direction: string): string | null {
    const directionMap: { [key: string]: string } = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up'
    };
    
    return directionMap[direction.toLowerCase()] || null;
  }

  /**
   * Generate a complementary thematic connection name
   */
  generateComplementaryConnectionName(returnName: string, direction: string): string {
    // Create a complementary thematic name based on the return path description
    // This ensures both directions have thematic names that make sense together
    
    // Extract key elements from the return name to create a complementary forward name
    if (returnName.includes('back through')) {
      // "back through the crystal entrance" -> "through the crystal entrance"
      return returnName.replace('back through', 'through');
    } else if (returnName.includes('back to')) {
      // "back to the garden" -> "to the shadowed passage"
      return `through the ${direction}ern passage`;
    } else if (returnName.includes('down')) {
      // "down the starlit steps" -> "up the starlit steps"
      return returnName.replace('down', 'up');
    } else if (returnName.includes('up')) {
      // "up the ancient stairs" -> "down the ancient stairs"
      return returnName.replace('up', 'down');
    } else if (returnName.includes('through')) {
      // Keep the thematic element but make it directional
      return returnName;
    } else {
      // Fallback: create a generic thematic name
      const thematicPrefixes = [
        'through the shadowed',
        'via the ancient',
        'through the ornate',
        'via the weathered',
        'through the mysterious'
      ];
      const prefix = thematicPrefixes[Math.floor(Math.random() * thematicPrefixes.length)];
      return `${prefix} ${direction}ern passage`;
    }
  }


  /**
   * Generate a room specifically for an unfilled connection
   */
  async generateRoomForConnection(connection: UnfilledConnection): Promise<RoomGenerationResult> {
    try {
      const fromRoom = await this.db.get<any>('SELECT * FROM rooms WHERE id = ?', [connection.from_room_id]);
      
      if (!fromRoom) {
        return { success: false, error: new Error('From room not found') };
      }

      // Determine region assignment using RegionService
      let regionId: number;
      let regionDistance: number;

      if (fromRoom.region_id && fromRoom.region_distance !== null) {
        // Check if we should create a new region or continue in current one
        const shouldCreateNewRegion = await this.regionService.shouldCreateNewRegion(fromRoom.region_distance, fromRoom.region_id);
        
        if (shouldCreateNewRegion) {
          // Generate new region with AI
          const existingRegions = await this.regionService.getRegionsForGame(connection.game_id);
          const regionContext: RegionGenerationContext = {
            gameId: connection.game_id,
            transitionFrom: {
              room: {
                name: fromRoom.name,
                description: fromRoom.description
              },
              region: existingRegions.find(r => r.id === fromRoom.region_id)
            },
            existingRegions: existingRegions.map(r => r.name || r.type)
          };

          const generatedRegion = await this.grokClient.generateRegion(regionContext);
          const newRegion = await this.regionService.createRegion(
            connection.game_id,
            generatedRegion.type,
            generatedRegion.description,
            generatedRegion.name
          );
          
          regionId = newRegion.id;
          regionDistance = this.regionService.generateRegionDistance(); // 2-7
          
          if (this.isDebugEnabled()) {
            console.log(`🏛️ Created new region: ${generatedRegion.name} (${generatedRegion.type}) for connection`);
          }
        } else {
          // Continue in current region, increase distance
          regionId = fromRoom.region_id;
          regionDistance = fromRoom.region_distance + 1;
          
          if (this.isDebugEnabled()) {
            console.log(`📍 Continuing in region ${regionId} at distance ${regionDistance} for connection`);
          }
        }
      } else {
        // From room has no region - create new one
        const regionContext: RegionGenerationContext = {
          gameId: connection.game_id,
          transitionFrom: {
            room: {
              name: fromRoom.name,
              description: fromRoom.description
            }
          }
        };

        const generatedRegion = await this.grokClient.generateRegion(regionContext);
        const newRegion = await this.regionService.createRegion(
          connection.game_id,
          generatedRegion.type,
          generatedRegion.description,
          generatedRegion.name
        );
        
        regionId = newRegion.id;
        regionDistance = this.regionService.generateRegionDistance();
        
        if (this.isDebugEnabled()) {
          console.log(`🏛️ Created first region: ${generatedRegion.name} (${generatedRegion.type}) for connection`);
        }
      }

      // Build regional context for room generation with connection-specific details
      const region = await this.regionService.getRegion(regionId);
      if (!region) {
        throw new Error('Failed to retrieve region for connection-based room generation');
      }

      const regionContext = {
        region,
        isCenter: regionDistance === 0,
        distanceFromCenter: regionDistance
      };

      const adjacentDescriptions = await this.regionService.getAdjacentRoomDescriptions(connection.from_room_id);
      const enhancedPrompt = await this.regionService.buildRoomGenerationPrompt(regionContext, adjacentDescriptions);

      // Get existing room names for context
      const existingRooms = await this.db.all(
        'SELECT name FROM rooms WHERE game_id = ? ORDER BY id',
        [connection.game_id]
      );
      const roomNames = existingRooms.map(room => room.name);

      // Select fantasy level for balanced room generation
      const fantasyLevelContext = this.fantasyLevelService.getFantasyLevelContext(region.type);
      
      if (this.isDebugEnabled()) {
        console.log(`🎭 Selected fantasy level: ${fantasyLevelContext.level} for connection generation in region: ${region.type}`);
      }

      // Generate room with connection context for better AI prompting and fantasy level
      const newRoom = await this.grokClient.generateRoom({
        currentRoom: { name: fromRoom.name, description: fromRoom.description },
        direction: connection.direction,
        gameHistory: roomNames,
        theme: enhancedPrompt, // Use the regional prompt as theme
        connectionName: connection.name, // Pass the connection name for context-aware generation
        fantasyLevel: fantasyLevelContext.level
      });

      // Check for duplicate room names and make unique if needed
      let uniqueName = newRoom.name;
      let counter = 1;
      
      while (true) {
        const existingRoom = await this.db.get(
          'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
          [connection.game_id, uniqueName]
        );
        
        if (!existingRoom) {
          break; // Name is unique
        }
        
        // Add counter to make name unique
        uniqueName = `${newRoom.name} ${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 100) {
          uniqueName = `${newRoom.name} ${Date.now()}`;
          break;
        }
      }

      // Create the room with region assignment
      const roomResult = await this.db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [connection.game_id, uniqueName, newRoom.description, regionId, regionDistance]
      );

      const newRoomId = roomResult.lastID as number;

      // Generate items for the room if AI provided them
      if (this.isDebugEnabled()) {
        console.log(`🔍 Room generation result has ${newRoom.items?.length || 0} items`);
      }
      
      // Create items in the database
      if (newRoom.items && newRoom.items.length > 0) {
        await this.itemGenerationService.createItemsFromRoomGeneration(
          newRoomId,
          newRoom.items
        );
      }

      // Create characters in the database if AI provided them, or generate fallback characters
      let charactersToCreate = newRoom.characters || [];
      
      // If no characters from AI and character generation is enabled, create some based on the description
      if (charactersToCreate.length === 0 && process.env.AI_CHARACTER_GENERATION_ENABLED !== 'false') {
        charactersToCreate = this.generateFallbackCharacters(uniqueName, newRoom.description);
      }
      
      if (this.isDebugEnabled()) {
        console.log(`🧙 Unfilled connection room generation has ${charactersToCreate.length} characters (${newRoom.characters?.length || 0} from AI, ${charactersToCreate.length - (newRoom.characters?.length || 0)} fallback)`);
      }
      
      if (charactersToCreate.length > 0) {
        try {
          await this.characterGenerationService.createCharactersFromRoomGeneration(
            connection.game_id,
            newRoomId,
            charactersToCreate
          );
        } catch (error) {
          // Log but don't fail room generation if character creation fails
          if (this.isDebugEnabled()) {
            console.error('Failed to create characters for unfilled connection room:', error);
          }
        }
      }

      // Update the connection to point to the new room (fill the connection)
      // Use a conditional update to prevent race conditions - only update if still unfilled
      const updateResult = await this.db.run(
        'UPDATE connections SET to_room_id = ? WHERE id = ? AND to_room_id IS NULL',
        [newRoomId, connection.id]
      );
      
      // Check if the update succeeded (connection was still unfilled)
      if (updateResult.changes === 0) {
        // Connection was already filled by another process - this is a race condition
        // Clean up the room we just created since it won't be used
        await this.db.run('DELETE FROM rooms WHERE id = ?', [newRoomId]);
        
        // Get the existing connection to return the correct room ID
        const existingConnection = await this.db.get<any>(
          'SELECT to_room_id FROM connections WHERE id = ?',
          [connection.id]
        );
        
        if (this.options.enableDebugLogging) {
          console.log(`🔄 Race condition detected: Connection ${connection.id} was already filled during generation. Using existing room ${existingConnection.to_room_id}.`);
        }
        
        return {
          success: true,
          roomId: existingConnection.to_room_id,
          connectionId: connection.id
        };
      }

      // Create return connection (filled immediately)
      const returnDirection = this.getReverseDirection(connection.direction);
      if (returnDirection) {
        // Find return connection name from AI response or generate complementary
        let returnConnectionName = 'back';
        if (newRoom.connections && newRoom.connections.length > 0) {
          const returnConnection = newRoom.connections.find(c => 
            c.direction === returnDirection
          );
          if (returnConnection) {
            returnConnectionName = returnConnection.name;
          }
        }
        
        if (returnConnectionName === 'back') {
          returnConnectionName = this.generateComplementaryConnectionName(connection.name, returnDirection);
        }

        await this.db.run(
          'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
          [connection.game_id, newRoomId, connection.from_room_id, returnDirection, returnConnectionName]
        );
      }

      // Create other AI-specified connections as unfilled connections
      if (newRoom.connections && newRoom.connections.length > 0) {
        for (const newConnection of newRoom.connections) {
          if (newConnection.direction !== returnDirection) {
            await this.db.run(
              'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
              [connection.game_id, newRoomId, null, newConnection.direction, newConnection.name]
            );
            
            if (this.isDebugEnabled()) {
              console.log(`🔗 Created unfilled connection from new room: ${newConnection.name} (${newConnection.direction})`);
            }
          }
        }
      }

      if (this.isDebugEnabled()) {
        console.log(`✨ Generated room for connection: ${uniqueName} via ${connection.name}`);
      }
      
      return { 
        success: true, 
        roomId: newRoomId,
        connectionId: connection.id
      };

    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error(`Failed to generate room for connection ${connection.id}:`, error);
      }
      return { 
        success: false, 
        error: error as Error 
      };
    }
  }

  /**
   * Check if debug logging is enabled
   */
  private isDebugEnabled(): boolean {
    return this.options.enableDebugLogging || process.env.AI_DEBUG_LOGGING === 'true';
  }

  /**
   * Update service options
   */
  updateOptions(options: Partial<RoomGenerationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current service configuration
   */
  getOptions(): RoomGenerationOptions {
    return { ...this.options };
  }

}