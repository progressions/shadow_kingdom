/**
 * Add validation rules (curses and conditions) to starter items
 * 
 * Prisma version - uses Prisma ORM for database operations
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../services/prismaService';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';

export async function addStarterItemValidations(
  gameId: number, 
  entranceId: number, 
  tui?: TUIInterface,
  prismaClient?: PrismaClient
): Promise<void> {
  const prisma = prismaClient || getPrismaClient();
  
  try {
    // 1. Ancient Key - Add "sticky" curse (can't be dropped)
    const ancientKey = await prisma.item.findFirst({
      where: { name: 'Ancient Key' }
    });
    
    if (ancientKey) {
      // Check if curse already exists
      const existingCurse = await prisma.itemCurse.findUnique({
        where: { itemId: ancientKey.id }
      });
      
      if (!existingCurse) {
        await prisma.itemCurse.create({
          data: {
            itemId: ancientKey.id,
            curseType: 'sticky',
            preventsActions: JSON.stringify(['drop']),
            curseMessage: 'The Ancient Key seems bound to you by mysterious forces. You cannot drop it.'
          }
        });
        
        if (tui) {
          tui.display('Added sticky curse to Ancient Key (prevents dropping)', MessageType.SYSTEM);
        }
      } else if (tui) {
        tui.display('Ancient Key already has a curse', MessageType.SYSTEM);
      }
    }

    // 2. Ancient Stone Pedestal - Add action condition (must be present to rest in Grand Entrance Hall)
    const stonePedestal = await prisma.item.findFirst({
      where: { name: 'Ancient Stone Pedestal' }
    });
    
    if (stonePedestal) {
      // Check if condition already exists
      const existingCondition = await prisma.actionCondition.findFirst({
        where: {
          entityType: 'room',
          entityId: entranceId,
          actionType: 'rest',
          conditionType: 'item_in_room'
        }
      });
      
      if (!existingCondition) {
        await prisma.actionCondition.create({
          data: {
            entityType: 'room',
            entityId: entranceId,
            actionType: 'rest',
            conditionType: 'item_in_room',
            conditionData: JSON.stringify({ 
              item_id: stonePedestal.id, 
              required: true 
            }),
            failureMessage: 'The mystical energy from the Ancient Stone Pedestal is required for safe rest in this hall.',
            hintMessage: 'Find the Ancient Stone Pedestal to rest peacefully here.',
            priority: 1
          }
        });
        
        if (tui) {
          tui.display('Added rest requirement for Ancient Stone Pedestal in Grand Entrance Hall', MessageType.SYSTEM);
        }
      }
    }

    // 3. Iron Helmet - Add "heavy" curse (prevents rest when equipped)
    const ironHelmet = await prisma.item.findFirst({
      where: { name: 'Iron Helmet' }
    });
    
    if (ironHelmet) {
      // Check if curse already exists
      const existingCurse = await prisma.itemCurse.findUnique({
        where: { itemId: ironHelmet.id }
      });
      
      if (!existingCurse) {
        await prisma.itemCurse.create({
          data: {
            itemId: ironHelmet.id,
            curseType: 'heavy',
            preventsActions: JSON.stringify(['rest']),
            curseMessage: 'The Iron Helmet is too heavy and uncomfortable to rest while wearing. You must remove it first.'
          }
        });
        
        if (tui) {
          tui.display('Added heavy curse to Iron Helmet (prevents rest when equipped)', MessageType.SYSTEM);
        }
      } else if (tui) {
        tui.display('Iron Helmet already has a curse', MessageType.SYSTEM);
      }
    }

  } catch (error) {
    if (tui) {
      tui.display(`Error adding starter item validations: ${error}`, MessageType.ERROR);
    }
    // Don't throw - validations are optional enhancements
  }
}