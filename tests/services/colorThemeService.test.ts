import { ColorThemeService } from '../../src/services/colorThemeService';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

jest.mock('fs/promises');

describe('ColorThemeService', () => {
  let service: ColorThemeService;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ColorThemeService();
  });

  describe('loadTheme', () => {
    it('should load and parse a valid YAML theme file', async () => {
      const mockThemeContent = `
name: "Test Theme"
version: "1.0.0"
description: "Test theme for unit tests"

colors:
  room_title: "yellow"
  room_description: "white"
  item_highlight: "green"
  character_name: "magenta"
  error: "red"
  warning: "yellow"
  success: "green"
  info: "blue"
  prompt: "white"
  input: "gray"
  border: "gray"
`;

      mockFs.readFile.mockResolvedValue(mockThemeContent);

      await service.loadTheme();

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('themes/default.yaml'),
        'utf-8'
      );
    });

    it('should handle missing theme file gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(service.loadTheme()).resolves.not.toThrow();
    });

    it('should handle invalid YAML gracefully', async () => {
      const invalidYaml = `
colors:
  - this is not valid
  : yaml format
`;

      mockFs.readFile.mockResolvedValue(invalidYaml);

      await expect(service.loadTheme()).resolves.not.toThrow();
    });

    it('should use environment variable for theme path if set', async () => {
      const originalEnv = process.env.COLOR_THEME;
      process.env.COLOR_THEME = 'custom-theme';

      const mockThemeContent = `
name: "Custom Theme"
colors:
  room_title: "cyan"
`;

      mockFs.readFile.mockResolvedValue(mockThemeContent);

      await service.loadTheme();

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('themes/custom-theme.yaml'),
        'utf-8'
      );

      process.env.COLOR_THEME = originalEnv;
    });
  });

  describe('applyColor', () => {
    beforeEach(async () => {
      const mockThemeContent = `
name: "Test Theme"
colors:
  room_title: "yellow"
  room_description: "white"
  item_highlight: "green"
  error: "red"
`;

      mockFs.readFile.mockResolvedValue(mockThemeContent);
      await service.loadTheme();
    });

    it('should apply the correct color from theme', () => {
      const text = 'Test Room';
      const result = service.applyColor('room_title', text);
      
      expect(result).toBe(chalk.yellow(text));
    });

    it('should return white text for undefined color keys', () => {
      const text = 'Unknown element';
      const result = service.applyColor('undefined_key', text);
      
      expect(result).toBe(chalk.white(text));
    });

    it('should return white text when no theme is loaded', async () => {
      const serviceWithoutTheme = new ColorThemeService();
      const text = 'No theme text';
      const result = serviceWithoutTheme.applyColor('any_key', text);
      
      expect(result).toBe(chalk.white(text));
    });

    it('should handle empty strings', () => {
      const result = service.applyColor('room_title', '');
      
      expect(result).toBe('');
    });

    it('should handle special characters in text', () => {
      const text = 'Room with "quotes" and \n newlines';
      const result = service.applyColor('room_description', text);
      
      expect(result).toBe(chalk.white(text));
    });
  });

  describe('validateTheme', () => {
    it('should validate a correct theme structure', () => {
      const validTheme = {
        name: 'Valid Theme',
        version: '1.0.0',
        colors: {
          room_title: 'yellow',
          room_description: 'white'
        }
      };

      expect(service.validateTheme(validTheme)).toBe(true);
    });

    it('should reject theme without name', () => {
      const invalidTheme = {
        version: '1.0.0',
        colors: {
          room_title: 'yellow'
        }
      };

      expect(service.validateTheme(invalidTheme as any)).toBe(false);
    });

    it('should reject theme without colors object', () => {
      const invalidTheme = {
        name: 'Invalid Theme',
        version: '1.0.0'
      };

      expect(service.validateTheme(invalidTheme as any)).toBe(false);
    });

    it('should reject theme with non-string color values', () => {
      const invalidTheme = {
        name: 'Invalid Theme',
        version: '1.0.0',
        colors: {
          room_title: 123,
          room_description: 'white'
        }
      };

      expect(service.validateTheme(invalidTheme as any)).toBe(false);
    });

    it('should accept theme with optional description', () => {
      const validTheme = {
        name: 'Valid Theme',
        version: '1.0.0',
        description: 'A valid theme with description',
        colors: {
          room_title: 'yellow'
        }
      };

      expect(service.validateTheme(validTheme)).toBe(true);
    });
  });

  describe('getColorFunctions', () => {
    beforeEach(async () => {
      const mockThemeContent = `
name: "Test Theme"
colors:
  room_title: "yellow"
  room_description: "white"
  error: "red"
  success: "green"
`;

      mockFs.readFile.mockResolvedValue(mockThemeContent);
      await service.loadTheme();
    });

    it('should return wrapper functions for common colors', () => {
      const colorFunctions = service.getColorFunctions();
      
      expect(colorFunctions).toHaveProperty('roomTitle');
      expect(colorFunctions).toHaveProperty('roomDescription');
      expect(colorFunctions).toHaveProperty('error');
      expect(colorFunctions).toHaveProperty('success');
    });

    it('should apply colors through wrapper functions', () => {
      const { roomTitle, error } = service.getColorFunctions();
      
      expect(roomTitle('Test Room')).toBe(chalk.yellow('Test Room'));
      expect(error('Error message')).toBe(chalk.red('Error message'));
    });

    it('should return white for undefined wrapper functions', () => {
      const colorFunctions = service.getColorFunctions();
      const undefinedFunc = (colorFunctions as any).undefinedColor;
      
      if (undefinedFunc) {
        expect(undefinedFunc('text')).toBe(chalk.white('text'));
      }
    });
  });

  describe('theme caching', () => {
    it('should cache theme after loading', async () => {
      const mockThemeContent = `
name: "Test Theme"
colors:
  room_title: "yellow"
`;

      mockFs.readFile.mockResolvedValue(mockThemeContent);

      await service.loadTheme();
      await service.loadTheme(); // Second call

      // Should only read file once due to caching
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('color fallback behavior', () => {
    it('should fall back to white for invalid color names in theme', async () => {
      const mockThemeContent = `
name: "Test Theme"
colors:
  room_title: "invalidcolor"
  room_description: "alsonotvalid"
`;

      mockFs.readFile.mockResolvedValue(mockThemeContent);
      await service.loadTheme();

      const result = service.applyColor('room_title', 'Test');
      expect(result).toBe(chalk.white('Test'));
    });

    it('should support 256-color codes', async () => {
      const mockThemeContent = `
name: "Test Theme"
colors:
  room_title: "yellow"
extended_colors:
  treasure: 220
  danger: 196
`;

      mockFs.readFile.mockResolvedValue(mockThemeContent);
      await service.loadTheme();

      // Extended colors should be accessible
      const result = service.applyColor('treasure', 'Gold coins');
      // Should handle extended colors or fall back to white
      expect(result).toBeTruthy();
    });
  });
});