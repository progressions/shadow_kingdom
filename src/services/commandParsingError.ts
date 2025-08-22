/**
 * Special error that commands can throw to signal that they couldn't parse
 * their arguments and would like to fall back to AI command parsing.
 */
export class CommandParsingError extends Error {
  public readonly originalInput: string;
  public readonly reason: string;

  constructor(originalInput: string, reason: string) {
    super(`Command parsing failed: ${reason}`);
    this.name = 'CommandParsingError';
    this.originalInput = originalInput;
    this.reason = reason;
  }

  /**
   * Check if an error is a CommandParsingError
   */
  static isCommandParsingError(error: any): error is CommandParsingError {
    return error instanceof CommandParsingError;
  }
}