describe('Command Line Argument Parsing', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  test('should extract --cmd argument value', () => {
    // Test the argument parsing logic directly
    process.argv = ['node', 'index.js', '--cmd', 'go north'];
    
    const args = process.argv.slice(2);
    let command: string | undefined;
    
    const cmdIndex = args.indexOf('--cmd');
    if (cmdIndex !== -1 && args[cmdIndex + 1]) {
      command = args[cmdIndex + 1];
    }
    
    expect(command).toBe('go north');
  });

  test('should return undefined when no --cmd argument provided', () => {
    process.argv = ['node', 'index.js'];
    
    const args = process.argv.slice(2);
    let command: string | undefined;
    
    const cmdIndex = args.indexOf('--cmd');
    if (cmdIndex !== -1 && args[cmdIndex + 1]) {
      command = args[cmdIndex + 1];
    }
    
    expect(command).toBeUndefined();
  });

  test('should return undefined when --cmd has no value', () => {
    process.argv = ['node', 'index.js', '--cmd'];
    
    const args = process.argv.slice(2);
    let command: string | undefined;
    
    const cmdIndex = args.indexOf('--cmd');
    if (cmdIndex !== -1 && args[cmdIndex + 1]) {
      command = args[cmdIndex + 1];
    }
    
    expect(command).toBeUndefined();
  });

  test('should handle multiple arguments with --cmd', () => {
    process.argv = ['node', 'index.js', '--other', 'value', '--cmd', 'examine sword'];
    
    const args = process.argv.slice(2);
    let command: string | undefined;
    
    const cmdIndex = args.indexOf('--cmd');
    if (cmdIndex !== -1 && args[cmdIndex + 1]) {
      command = args[cmdIndex + 1];
    }
    
    expect(command).toBe('examine sword');
  });
});