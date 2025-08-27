import { 
  createASCIIUnderline, 
  isRoomName, 
  extractRoomName, 
  convertExitsToLegacyFormat, 
  ensureRoomNameFormatting 
} from '../../src/utils/textFormatting';

describe('textFormatting utilities', () => {
  describe('createASCIIUnderline', () => {
    it('creates underline matching text length', () => {
      expect(createASCIIUnderline('Castle Entrance')).toBe('===============');
    });

    it('handles empty strings', () => {
      expect(createASCIIUnderline('')).toBe('');
    });

    it('uses custom characters', () => {
      expect(createASCIIUnderline('Test', '-')).toBe('----');
    });
  });

  describe('isRoomName', () => {
    it('identifies room names with ASCII underlines', () => {
      expect(isRoomName('Castle Entrance\n===============')).toBe(true);
    });

    it('identifies all-caps room names', () => {
      expect(isRoomName('DUNGEON ENTRANCE')).toBe(true);
    });

    it('excludes error messages', () => {
      expect(isRoomName('ERROR: SOMETHING WENT WRONG')).toBe(false);
    });

    it('excludes system messages', () => {
      expect(isRoomName('UNABLE TO PROCEED')).toBe(false);
    });

    it('excludes messages with colons', () => {
      expect(isRoomName('EXITS: NORTH, SOUTH')).toBe(false);
    });

    it('excludes very long text', () => {
      const longText = 'A'.repeat(150);
      expect(isRoomName(longText)).toBe(false);
    });

    it('excludes very short text', () => {
      expect(isRoomName('A')).toBe(false);
    });
  });

  describe('extractRoomName', () => {
    it('extracts room name from underlined format', () => {
      expect(extractRoomName('Castle Entrance\n===============')).toBe('Castle Entrance');
    });

    it('extracts room name from single line', () => {
      expect(extractRoomName('DUNGEON ENTRANCE')).toBe('DUNGEON ENTRANCE');
    });
  });

  describe('convertExitsToLegacyFormat', () => {
    it('converts modern arrow format to legacy', () => {
      const input = '→ Available exits: north, up';
      const expected = 'Exits: north, up';
      expect(convertExitsToLegacyFormat(input)).toBe(expected);
    });

    it('leaves legacy format unchanged', () => {
      const input = 'Exits: north, south, east';
      expect(convertExitsToLegacyFormat(input)).toBe(input);
    });

    it('leaves other content unchanged', () => {
      const input = 'You stand in a grand hall.';
      expect(convertExitsToLegacyFormat(input)).toBe(input);
    });
  });

  describe('ensureRoomNameFormatting', () => {
    it('adds underline to room name without one', () => {
      const result = ensureRoomNameFormatting('ANCIENT LIBRARY');
      expect(result).toBe('ANCIENT LIBRARY\n===============');
    });

    it('leaves already formatted room names unchanged', () => {
      const input = 'Castle Entrance\n===============';
      expect(ensureRoomNameFormatting(input)).toBe(input);
    });

    it('adds underline to any text passed to it', () => {
      const input = 'You stand before a door.';
      const expected = 'You stand before a door.\n========================';
      expect(ensureRoomNameFormatting(input)).toBe(expected);
    });
  });
});