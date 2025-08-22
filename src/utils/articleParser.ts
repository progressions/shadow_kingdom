/**
 * Article Parser Utility
 * 
 * Provides functionality to strip common English articles ("the", "a", "an") 
 * from natural language input to make command parsing more flexible and natural.
 */

/**
 * Strip articles from natural language input
 * @param input Raw user input string
 * @returns Input with articles removed and whitespace normalized
 */
export function stripArticles(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let result = input.trim();
  
  // Keep removing leading and middle articles until no more changes
  let previousResult = '';
  while (result !== previousResult) {
    previousResult = result;
    
    // Remove leading articles (case insensitive)
    result = result.replace(/^(the|a|an)\s+/i, '');
    
    // Remove middle articles while preserving sentence structure
    result = result.replace(/\s+(the|a|an)\s+/gi, ' ');
    
    // Clean up multiple consecutive spaces and trim
    result = result.replace(/\s+/g, ' ').trim();
  }
  
  // Handle the case where the input was only articles
  if (result.match(/^(the|a|an)$/i)) {
    return '';
  }
  
  return result;
}

/**
 * Parse complex give command with preposition handling
 * Handles "give [item] to [target]" while stripping articles from both parts
 * @param args Array of command arguments
 * @returns Object with cleaned item and target names
 */
export function parseGiveCommand(args: string[]): { item: string; target: string } {
  const fullCommand = args.join(' ').trim();
  
  // Handle empty command or command with only "to"
  if (!fullCommand || fullCommand.toLowerCase() === 'to') {
    return { item: '', target: '' };
  }
  
  const toIndex = fullCommand.toLowerCase().indexOf(' to ');
  
  if (toIndex === -1) {
    // No "to" found, treat entire input as item name
    return { 
      item: stripArticles(fullCommand), 
      target: '' 
    };
  }
  
  const itemPart = fullCommand.substring(0, toIndex);
  const targetPart = fullCommand.substring(toIndex + 4); // " to ".length = 4
  
  return {
    item: stripArticles(itemPart),
    target: stripArticles(targetPart)
  };
}

/**
 * Parse talk command handling both "talk [character]" and "talk to [character]"
 * @param args Array of command arguments
 * @returns Cleaned character name
 */
export function parseTalkCommand(args: string[]): string {
  const fullCommand = args.join(' ').trim();
  
  // Handle empty command or just "to"
  if (!fullCommand || fullCommand.toLowerCase() === 'to') {
    return '';
  }
  
  // Handle "talk to [character]" format
  if (fullCommand.toLowerCase().startsWith('to ')) {
    const characterPart = fullCommand.substring(3).trim(); // Remove "to " prefix
    return stripArticles(characterPart);
  }
  
  // Handle direct "talk [character]" format
  return stripArticles(fullCommand);
}