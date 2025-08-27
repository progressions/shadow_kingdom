import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';

export interface ColorTheme {
  name: string;
  version: string;
  description?: string;
  colors: Record<string, string>;
  extended_colors?: Record<string, number>;
}

export interface IColorThemeService {
  loadTheme(): Promise<void>;
  applyColor(colorKey: string, text: string): string;
  validateTheme(theme: ColorTheme): boolean;
  getColorFunctions(): Record<string, (text: string) => string>;
}

export class ColorThemeService implements IColorThemeService {
  private theme: ColorTheme | null = null;
  private themeLoaded = false;
  private colorCache: Map<string, (text: string) => string> = new Map();

  constructor() {}

  async loadTheme(): Promise<void> {
    if (this.themeLoaded) {
      return;
    }

    try {
      const themeName = process.env.COLOR_THEME || 'default';
      const themePath = path.join(process.cwd(), 'themes', `${themeName}.yaml`);
      
      const themeContent = await fs.readFile(themePath, 'utf-8');
      const parsedTheme = yaml.load(themeContent) as ColorTheme;
      
      if (this.validateTheme(parsedTheme)) {
        this.theme = parsedTheme;
        this.initializeColorCache();
      } else {
        console.warn('Theme validation failed, using default white colors');
        this.theme = this.getDefaultTheme();
      }
    } catch (error) {
      console.warn('Failed to load theme, using default white colors:', error);
      this.theme = this.getDefaultTheme();
    }

    this.themeLoaded = true;
  }

  applyColor(colorKey: string, text: string): string {
    if (!text) {
      return '';
    }

    if (!this.theme) {
      return chalk.white(text);
    }

    // Check regular colors first
    if (this.theme.colors && this.theme.colors[colorKey]) {
      const colorName = this.theme.colors[colorKey];
      return this.applyChalkColor(colorName, text);
    }

    // Check extended colors (256-color support)
    if (this.theme.extended_colors && this.theme.extended_colors[colorKey]) {
      const colorCode = this.theme.extended_colors[colorKey];
      try {
        return chalk.ansi256(colorCode)(text);
      } catch {
        return chalk.white(text);
      }
    }

    // Default to white for any undefined color
    return chalk.white(text);
  }

  validateTheme(theme: any): boolean {
    if (!theme || typeof theme !== 'object') {
      return false;
    }

    if (!theme.name || typeof theme.name !== 'string') {
      return false;
    }

    if (!theme.version || typeof theme.version !== 'string') {
      return false;
    }

    if (!theme.colors || typeof theme.colors !== 'object') {
      return false;
    }

    // Validate all color values are strings
    for (const key in theme.colors) {
      if (typeof theme.colors[key] !== 'string') {
        return false;
      }
    }

    // Validate extended colors if present
    if (theme.extended_colors) {
      if (typeof theme.extended_colors !== 'object') {
        return false;
      }
      for (const key in theme.extended_colors) {
        if (typeof theme.extended_colors[key] !== 'number') {
          return false;
        }
      }
    }

    return true;
  }

  getColorFunctions(): Record<string, (text: string) => string> {
    const functions: Record<string, (text: string) => string> = {};
    
    // Common color function mappings
    const colorMappings: Record<string, string> = {
      roomTitle: 'room_title',
      roomDescription: 'room_description',
      itemHighlight: 'item_highlight',
      characterName: 'character_name',
      error: 'error',
      warning: 'warning',
      success: 'success',
      info: 'info',
      prompt: 'prompt',
      input: 'input',
      border: 'border'
    };

    for (const [funcName, colorKey] of Object.entries(colorMappings)) {
      functions[funcName] = (text: string) => this.applyColor(colorKey, text);
    }

    return functions;
  }

  private applyChalkColor(colorName: string, text: string): string {
    try {
      // Check if chalk has this color
      if (colorName in chalk && typeof (chalk as any)[colorName] === 'function') {
        return (chalk as any)[colorName](text);
      }
      // Fall back to white for invalid color names
      return chalk.white(text);
    } catch {
      return chalk.white(text);
    }
  }

  private initializeColorCache(): void {
    if (!this.theme) return;

    // Pre-compile color functions for better performance
    for (const [key, colorName] of Object.entries(this.theme.colors)) {
      if (colorName in chalk && typeof (chalk as any)[colorName] === 'function') {
        this.colorCache.set(key, (chalk as any)[colorName]);
      } else {
        this.colorCache.set(key, chalk.white);
      }
    }
  }

  private getDefaultTheme(): ColorTheme {
    return {
      name: 'Default Fallback Theme',
      version: '1.0.0',
      description: 'Fallback theme with white colors',
      colors: {
        room_title: 'white',
        room_description: 'white',
        item_highlight: 'white',
        character_name: 'white',
        error: 'white',
        warning: 'white',
        success: 'white',
        info: 'white',
        prompt: 'white',
        input: 'white',
        border: 'white'
      }
    };
  }
}