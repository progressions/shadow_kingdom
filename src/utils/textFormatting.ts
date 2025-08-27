/**
 * Text formatting utilities for legacy-style game presentation
 */

/**
 * Generates ASCII underline matching the length of the given text
 */
export function createASCIIUnderline(text: string, character: string = '='): string {
  return character.repeat(text.length);
}

/**
 * Checks if content appears to be a room name that should get legacy formatting
 */
export function isRoomName(content: string): boolean {
  // Check for existing ASCII underlines pattern
  const lines = content.split('\n');
  if (lines.length >= 2) {
    const underline = lines[1].trim();
    if (underline.length > 0 && underline === '='.repeat(underline.length)) {
      return true;
    }
  }

  // Check for all uppercase room names (but not errors or system messages)
  if (
    content === content.toUpperCase() &&
    content.length > 2 &&
    content.length < 100 &&
    !content.includes(':') &&
    !content.includes('ERROR') &&
    !content.includes('UNABLE')
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts room name from content, handling both underlined and plain formats
 */
export function extractRoomName(content: string): string {
  const lines = content.split('\n');
  return lines[0].trim();
}

/**
 * Converts modern exit format to legacy format
 */
export function convertExitsToLegacyFormat(content: string): string {
  // Convert "→ Available exits: north, up" to "Exits: north, up"
  if (content.startsWith('→ Available exits:')) {
    return content.replace('→ Available exits:', 'Exits:');
  }

  return content;
}

/**
 * Formats room name with ASCII underline if not already present
 */
export function ensureRoomNameFormatting(content: string): string {
  // If already has underline, return as-is
  if (content.includes('\n') && content.includes('=')) {
    return content;
  }

  // If it's a room name without underline, add one
  if (isRoomName(content)) {
    const roomName = extractRoomName(content);
    const underline = createASCIIUnderline(roomName);
    return `${roomName}\n${underline}`;
  }

  return content;
}
