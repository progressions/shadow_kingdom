/**
 * StatusManager handles dynamic status content for the Terminal UI.
 * It determines what information to show based on current game state
 * and manages the adaptive sizing of the status area.
 */

export interface GameState {
  gameName?: string;
  currentRoomName?: string;
  roomCount?: number;
  connectionCount?: number;
  unfilledConnections?: number;
  currentRegion?: string;
  aiGenerating?: boolean;
  aiTarget?: string;
  aiElapsed?: number;
  generationQueue?: number;
  tokenUsage?: number;
  cooldownRemaining?: number;
  mode?: 'menu' | 'game';
}

export interface StatusInfo {
  lines: string[];
  height: number; // Including borders
}

export class StatusManager {
  
  /**
   * Generate status information based on current game state
   */
  public generateStatus(gameState: GameState): StatusInfo {
    const lines: string[] = [];
    
    // Always show basic game info (line 1)
    lines.push(this.formatBasicInfo(gameState));
    
    // Add region/connection info if in game mode (line 2)
    if (gameState.mode === 'game' && this.shouldShowRegionInfo(gameState)) {
      lines.push(this.formatRegionInfo(gameState));
    }
    
    // Add AI generation status if active (line 3)
    if (this.shouldShowAIStatus(gameState)) {
      lines.push(this.formatAIStatus(gameState));
    }
    
    // Add queue/performance info if busy (line 4)
    if (this.shouldShowQueueInfo(gameState)) {
      lines.push(this.formatQueueInfo(gameState));
    }
    
    return {
      lines,
      height: lines.length + 2 // Add 2 for top/bottom borders
    };
  }

  /**
   * Format the basic game information (always shown)
   */
  private formatBasicInfo(gameState: GameState): string {
    const parts: string[] = [];
    
    if (gameState.gameName) {
      parts.push(`Game: ${gameState.gameName}`);
    }
    
    if (gameState.currentRoomName) {
      parts.push(`Room: ${gameState.currentRoomName}`);
    }
    
    if (gameState.roomCount !== undefined) {
      parts.push(`Rooms: ${gameState.roomCount}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Format region and connection information
   */
  private formatRegionInfo(gameState: GameState): string {
    const parts: string[] = [];
    
    if (gameState.currentRegion) {
      parts.push(`Region: ${gameState.currentRegion}`);
    }
    
    if (gameState.connectionCount !== undefined) {
      let connectionInfo = `Connections: ${gameState.connectionCount}`;
      
      if (gameState.unfilledConnections !== undefined && gameState.unfilledConnections > 0) {
        connectionInfo += `, ${gameState.unfilledConnections} unfilled`;
      } else {
        connectionInfo += ' total';
      }
      
      parts.push(connectionInfo);
    }
    
    return parts.join(' | ');
  }

  /**
   * Format AI generation status
   */
  private formatAIStatus(gameState: GameState): string {
    if (!gameState.aiGenerating || !gameState.aiTarget) {
      return '';
    }
    
    let status = `AI: Generating ${gameState.aiTarget}`;
    
    if (gameState.aiElapsed !== undefined) {
      status += ` [${gameState.aiElapsed.toFixed(1)}s]`;
    } else {
      status += '...';
    }
    
    return status;
  }

  /**
   * Format queue and performance information
   */
  private formatQueueInfo(gameState: GameState): string {
    const parts: string[] = [];
    
    if (gameState.generationQueue !== undefined && gameState.generationQueue > 0) {
      parts.push(`Queue: ${gameState.generationQueue} rooms pending`);
    }
    
    if (gameState.tokenUsage !== undefined) {
      parts.push(`Tokens: ${gameState.tokenUsage.toLocaleString()}`);
    }
    
    if (gameState.cooldownRemaining !== undefined && gameState.cooldownRemaining > 0) {
      parts.push(`Cooldown: ${Math.ceil(gameState.cooldownRemaining / 1000)}s`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Determine if region information should be shown
   */
  private shouldShowRegionInfo(gameState: GameState): boolean {
    return !!(gameState.currentRegion || gameState.connectionCount !== undefined);
  }

  /**
   * Determine if AI status should be shown
   */
  private shouldShowAIStatus(gameState: GameState): boolean {
    return !!(gameState.aiGenerating && gameState.aiTarget);
  }

  /**
   * Determine if queue information should be shown
   */
  private shouldShowQueueInfo(gameState: GameState): boolean {
    return !!(
      (gameState.generationQueue !== undefined && gameState.generationQueue > 0) ||
      gameState.tokenUsage !== undefined ||
      (gameState.cooldownRemaining !== undefined && gameState.cooldownRemaining > 0)
    );
  }

  /**
   * Calculate the minimum height needed for status area
   */
  public calculateMinHeight(gameState: GameState): number {
    return this.generateStatus(gameState).height;
  }

  /**
   * Create a simple status for menu mode
   */
  public createMenuStatus(gameCount?: number): StatusInfo {
    const gameInfo = gameCount !== undefined ? `${gameCount} games available` : 'Main Menu';
    
    return {
      lines: [`Shadow Kingdom | ${gameInfo}`],
      height: 3 // 1 line + 2 for borders
    };
  }

  /**
   * Create an error status display
   */
  public createErrorStatus(message: string): StatusInfo {
    return {
      lines: [`❌ ${message}`],
      height: 3 // 1 line + 2 for borders
    };
  }

  /**
   * Create a loading/connecting status
   */
  public createLoadingStatus(message: string = 'Loading...'): StatusInfo {
    return {
      lines: [`⏳ ${message}`],
      height: 3 // 1 line + 2 for borders
    };
  }
}