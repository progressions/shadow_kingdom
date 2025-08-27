# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-27-yaml-color-theming/spec.md

> Created: 2025-08-27
> Version: 1.0.0

## Technical Requirements

### YAML Theme Structure
```yaml
# themes/default.yaml
name: "Default Shadow Kingdom Theme"
version: "1.0.0"
description: "Classic Shadow Kingdom color scheme"

colors:
  # Core game elements
  room_description: "cyan"
  room_title: "yellow"
  item_highlight: "green"
  character_name: "magenta"
  
  # System messages
  error: "red"
  warning: "yellow"  
  success: "green"
  info: "blue"
  
  # Interface elements
  prompt: "white"
  input: "gray"
  border: "gray"
  
  # Status indicators
  health: "red"
  energy: "blue"
  experience: "yellow"

# Optional: 256-color support
extended_colors:
  room_ambient: 94      # Dark green
  treasure: 220         # Gold
  danger: 196           # Bright red
```

### ColorThemeService Architecture
```typescript
interface ColorTheme {
  name: string;
  version: string;
  description?: string;
  colors: Record<string, string>;
  extended_colors?: Record<string, number>;
}

interface ColorThemeService {
  loadTheme(): Promise<void>; // Loads theme at startup only
  applyColor(colorKey: string, text: string): string;
  validateTheme(theme: ColorTheme): boolean;
}
```

### File System Structure
```
themes/
├── default.yaml          # Default theme matching current colors
├── dark.yaml            # Dark theme variant
├── light.yaml           # Light theme variant
└── high-contrast.yaml   # Accessibility theme

src/services/
└── colorThemeService.ts  # Main service implementation

src/utils/
└── textFormatting.ts     # Updated to use ColorThemeService
```

## Approach

### Phase 1: Service Implementation
1. **Create ColorThemeService**: Core theme loading and validation logic
2. **Implement YAML parsing**: Safe YAML loading with error handling
3. **Add color application methods**: Wrapper functions for chalk with theme lookup
4. **Create default theme**: Extract current hardcoded colors into YAML

### Phase 2: Integration
1. **Update textFormatting.ts**: Replace chalk calls with ColorThemeService
2. **Modify GamePane styling**: Use theme-based colors for UI elements
3. **Update service initialization**: Add ColorThemeService to dependency injection
4. **Add configuration support**: Enable theme selection via environment variables

### Phase 3: Testing & Validation
1. **Unit tests**: Theme loading, validation, color application
2. **Integration tests**: Full game flow with different themes
3. **Error handling tests**: Malformed YAML, missing themes, invalid colors
4. **Visual regression testing**: Ensure default theme matches current appearance

### Migration Strategy
```typescript
// Before (hardcoded)
chalk.cyan("You see a mysterious door")

// After (theme-based)
colorThemeService.applyColor('room_description', "You see a mysterious door")
// If 'room_description' is not defined in theme, defaults to white

// Utility wrapper for common patterns
const { roomDesc, itemHighlight, error } = colorThemeService.getColorFunctions();
roomDesc("You see a mysterious door")
```

## External Dependencies

### New Dependencies
- **js-yaml** (^4.1.0): YAML parsing and validation
- **@types/js-yaml** (^4.0.5): TypeScript definitions

### Enhanced Dependencies  
- **chalk** (existing): Continue using for terminal color application
- **fs/promises** (Node.js built-in): Async file system operations

### Development Dependencies
- **yaml-lint**: Theme file validation during build process
- **@types/jest**: Enhanced testing for async theme operations

### Environment Variables
```bash
# Theme configuration
COLOR_THEME=default              # Active theme name
THEME_DIRECTORY=./themes         # Custom theme directory path
COLOR_SUPPORT_LEVEL=256          # Terminal color support level (16|256)
THEME_VALIDATION_STRICT=true     # Strict theme validation mode
```

### Error Handling Requirements
- **Graceful degradation**: Fall back to white color if theme color not found
- **Validation feedback**: Clear error messages for malformed themes  
- **Missing theme handling**: Auto-fallback to white for any missing color definitions
- **Color support detection**: Automatic terminal capability detection
- **Universal fallback**: All undefined colors default to white (#FFFFFF)

### Performance Considerations
- **Startup loading**: Load theme once at application startup
- **No runtime switching**: Single theme loaded for entire session
- **Color function memoization**: Cache frequently used color applications
- **YAML parsing optimization**: Parse theme during service initialization only