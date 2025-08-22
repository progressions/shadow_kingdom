import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { calculateMaxHealth } from '../types/character';

export interface HealthStatus {
  current: number;
  maximum: number;
  percentage: number;
  isDead: boolean;
  status: 'healthy' | 'injured' | 'critical' | 'dead';
}

export class HealthServicePrisma {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Initialize health values for a character based on their constitution
   */
  async initializeHealth(characterId: number): Promise<void> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: { constitution: true }
    });

    if (!character) {
      throw new Error('Character not found');
    }

    const maxHealth = calculateMaxHealth(character.constitution);
    
    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        max_health: maxHealth,
        current_health: maxHealth,
        is_dead: false
      }
    });
  }

  /**
   * Get current health status for a character
   */
  async getHealthStatus(characterId: number): Promise<HealthStatus> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        max_health: true,
        current_health: true,
        is_dead: true
      }
    });

    if (!character) {
      throw new Error('Character not found');
    }

    const current = character.current_health || 0;
    const maximum = character.max_health || 0;
    const percentage = maximum > 0 ? Math.round((current / maximum) * 100) : 0;
    const isDead = character.is_dead || current <= 0;

    let status: 'healthy' | 'injured' | 'critical' | 'dead';
    if (isDead) {
      status = 'dead';
    } else if (percentage >= 75) {
      status = 'healthy';
    } else if (percentage >= 25) {
      status = 'injured';
    } else {
      status = 'critical';
    }

    return {
      current,
      maximum,
      percentage,
      isDead,
      status
    };
  }

  /**
   * Apply damage to a character
   */
  async applyDamage(characterId: number, damage: number): Promise<HealthStatus> {
    if (damage < 0) {
      throw new Error('Damage must be non-negative');
    }

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        max_health: true,
        current_health: true
      }
    });

    if (!character) {
      throw new Error('Character not found');
    }

    const currentHealth = character.current_health || 0;
    const newHealth = Math.max(0, currentHealth - damage);
    const isDead = newHealth <= 0;

    // Update both current health and death state
    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        current_health: newHealth,
        is_dead: isDead
      }
    });

    return this.getHealthStatus(characterId);
  }

  /**
   * Apply healing to a character
   */
  async applyHealing(characterId: number, healing: number): Promise<HealthStatus> {
    if (healing < 0) {
      throw new Error('Healing must be non-negative');
    }

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        max_health: true,
        current_health: true,
        is_dead: true
      }
    });

    if (!character) {
      throw new Error('Character not found');
    }

    // Can't heal dead characters
    if (character.is_dead) {
      throw new Error('Cannot heal dead characters');
    }

    const currentHealth = character.current_health || 0;
    const maxHealth = character.max_health || 0;
    const newHealth = Math.min(maxHealth, currentHealth + healing);

    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        current_health: newHealth
      }
    });

    return this.getHealthStatus(characterId);
  }

  /**
   * Perform full healing (rest)
   */
  async restoreToFull(characterId: number): Promise<HealthStatus> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        max_health: true,
        is_dead: true
      }
    });

    if (!character) {
      throw new Error('Character not found');
    }

    // Can't heal dead characters
    if (character.is_dead) {
      throw new Error('Cannot heal dead characters');
    }

    const maxHealth = character.max_health || 0;

    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        current_health: maxHealth
      }
    });

    return this.getHealthStatus(characterId);
  }

  /**
   * Get health display string for UI
   */
  getHealthDisplay(healthStatus: HealthStatus): string {
    const { current, maximum, percentage, status } = healthStatus;
    
    // Create health bar
    const barLength = 10;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    // Color based on health status
    let color: string;
    switch (status) {
      case 'healthy': color = '💚'; break;
      case 'injured': color = '💛'; break;
      case 'critical': color = '❤️'; break;
      case 'dead': color = '💀'; break;
    }
    
    return `${color} HP: ${current}/${maximum} [${bar}] ${percentage}%`;
  }

  /**
   * Check if character needs health initialization
   */
  async needsHealthInitialization(characterId: number): Promise<boolean> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: { max_health: true }
    });

    return !character || character.max_health === null;
  }

  /**
   * Recalculate max health if constitution changed
   */
  async recalculateMaxHealth(characterId: number): Promise<void> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        constitution: true,
        max_health: true,
        current_health: true
      }
    });

    if (!character) {
      throw new Error('Character not found');
    }

    const newMaxHealth = calculateMaxHealth(character.constitution);
    const oldMaxHealth = character.max_health || 0;
    const currentHealth = character.current_health || 0;

    // If max health increased, maintain the same ratio of current to max
    // If max health decreased, reduce current health proportionally
    let newCurrentHealth = currentHealth;
    if (newMaxHealth !== oldMaxHealth && oldMaxHealth > 0) {
      const healthRatio = currentHealth / oldMaxHealth;
      newCurrentHealth = Math.round(newMaxHealth * healthRatio);
    }

    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        max_health: newMaxHealth,
        current_health: newCurrentHealth
      }
    });
  }
}