# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-27-legacy-visual-styling/spec.md

> Created: 2025-08-27
> Version: 1.0.0

## Internal Component APIs

### GamePane Component Enhanced API

#### New Props Interface
```typescript
interface GamePaneProps {
  messages: GameMessage[];
  maxLines: number;
  // New styling props
  theme?: GameTheme;
  enableRichText?: boolean;
  enableColors?: boolean;
  messageFormatting?: MessageFormattingOptions;
}

interface MessageFormattingOptions {
  showTimestamps?: boolean;
  indentDialogue?: boolean;
  highlightActions?: boolean;
  wrapLongLines?: boolean;
}
```

#### New Message Formatting Methods
```typescript
class GamePane {
  // Enhanced message rendering
  private formatMessage(message: GameMessage, options: MessageFormattingOptions): string;
  private applyTextStyles(content: string, type: MessageType): string;
  private wrapText(text: string, maxWidth: number): string[];
  private highlightKeywords(text: string, keywords: string[]): string;
  
  // Color and emphasis methods
  private applyColor(text: string, color: ChalkColor): string;
  private applyEmphasis(text: string, emphasis: TextEmphasis): string;
  private processMarkdown(text: string): string;
}
```

### Enhanced Text Processing API

#### New TextProcessor Service
```typescript
interface ITextProcessor {
  formatGameText(text: string, type: MessageType): string;
  applyTheme(text: string, theme: GameTheme): string;
  processDialogue(dialogue: string, speaker?: string): string;
  formatAction(action: string): string;
  formatDescription(description: string): string;
  formatError(error: string): string;
  formatSuccess(success: string): string;
}

class TextProcessor implements ITextProcessor {
  constructor(private theme: GameTheme) {}
  
  // Core formatting methods
  formatGameText(text: string, type: MessageType): string;
  applyTheme(text: string, theme: GameTheme): string;
  processDialogue(dialogue: string, speaker?: string): string;
  formatAction(action: string): string;
  formatDescription(description: string): string;
  formatError(error: string): string;
  formatSuccess(success: string): string;
  
  // Utility methods
  private stripMarkdown(text: string): string;
  private detectMessageType(text: string): MessageType;
  private applyColorScheme(text: string, scheme: ColorScheme): string;
}
```

### Color and Style Utility Functions

#### StyleUtils Module
```typescript
interface StyleUtils {
  // Color utilities
  colors: {
    primary: (text: string) => string;
    secondary: (text: string) => string;
    accent: (text: string) => string;
    error: (text: string) => string;
    success: (text: string) => string;
    warning: (text: string) => string;
    muted: (text: string) => string;
    bright: (text: string) => string;
  };
  
  // Text emphasis
  emphasis: {
    bold: (text: string) => string;
    italic: (text: string) => string;
    underline: (text: string) => string;
    strikethrough: (text: string) => string;
    dim: (text: string) => string;
  };
  
  // Box drawing and borders
  boxes: {
    simple: (content: string, title?: string) => string;
    double: (content: string, title?: string) => string;
    rounded: (content: string, title?: string) => string;
    ascii: (content: string, title?: string) => string;
  };
  
  // Layout utilities
  layout: {
    center: (text: string, width: number) => string;
    pad: (text: string, left: number, right?: number) => string;
    truncate: (text: string, maxLength: number) => string;
    wordWrap: (text: string, width: number) => string[];
  };
}
```

#### Theme Management API
```typescript
interface ThemeManager {
  getCurrentTheme(): GameTheme;
  setTheme(theme: GameTheme): void;
  getAvailableThemes(): GameTheme[];
  createCustomTheme(config: ThemeConfig): GameTheme;
  resetToDefault(): void;
}

class ThemeManager implements IThemeManager {
  private currentTheme: GameTheme;
  private themes: Map<string, GameTheme>;
  
  constructor() {
    this.loadBuiltinThemes();
  }
  
  getCurrentTheme(): GameTheme;
  setTheme(theme: GameTheme): void;
  getAvailableThemes(): GameTheme[];
  createCustomTheme(config: ThemeConfig): GameTheme;
  resetToDefault(): void;
  
  private loadBuiltinThemes(): void;
  private validateTheme(theme: GameTheme): boolean;
}
```

## Service Integration Points

### GameStateManager Integration
```typescript
interface GameStateManager {
  // Existing methods...
  
  // New styling-related state methods
  getCurrentTheme(): GameTheme;
  setUserTheme(theme: GameTheme): void;
  getDisplayPreferences(): DisplayPreferences;
  updateDisplayPreferences(prefs: Partial<DisplayPreferences>): void;
}

interface DisplayPreferences {
  theme: string;
  enableColors: boolean;
  enableRichText: boolean;
  messageFormatting: MessageFormattingOptions;
  terminalWidth?: number;
  lineHeight?: number;
}
```

### CommandRouter Integration
```typescript
interface CommandRouter {
  // Existing methods...
  
  // New theme-related commands
  addThemeCommands(): void;
  handleThemeCommand(args: string[]): Promise<void>;
  handleStyleCommand(args: string[]): Promise<void>;
}

// New theme management commands
const THEME_COMMANDS = {
  'theme': {
    description: 'Manage visual themes',
    subcommands: {
      'list': 'List available themes',
      'set <name>': 'Set active theme',
      'reset': 'Reset to default theme'
    }
  },
  'style': {
    description: 'Configure display options',
    subcommands: {
      'colors on|off': 'Enable/disable colors',
      'rich-text on|off': 'Enable/disable rich text formatting',
      'timestamps on|off': 'Show/hide message timestamps'
    }
  }
};
```

## New Interfaces and Types

### Core Type Definitions
```typescript
// Message formatting types
type MessageType = 'dialogue' | 'action' | 'description' | 'system' | 'error' | 'success' | 'debug';

interface GameMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  speaker?: string;
  metadata?: MessageMetadata;
}

interface MessageMetadata {
  room?: string;
  source?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
}

// Theme and styling types
interface GameTheme {
  name: string;
  description: string;
  colorScheme: ColorScheme;
  textStyles: TextStyles;
  boxStyles: BoxStyles;
  messageTypes: MessageTypeStyles;
}

interface ColorScheme {
  primary: ChalkColor;
  secondary: ChalkColor;
  accent: ChalkColor;
  background: ChalkColor;
  text: ChalkColor;
  error: ChalkColor;
  success: ChalkColor;
  warning: ChalkColor;
  muted: ChalkColor;
  bright: ChalkColor;
}

interface TextStyles {
  body: TextStyle;
  dialogue: TextStyle;
  actions: TextStyle;
  descriptions: TextStyle;
  system: TextStyle;
  emphasis: EmphasisStyles;
}

interface TextStyle {
  color?: ChalkColor;
  backgroundColor?: ChalkColor;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
}

interface EmphasisStyles {
  strong: TextStyle;
  emphasis: TextStyle;
  code: TextStyle;
  quote: TextStyle;
}

interface BoxStyles {
  simple: BoxStyle;
  double: BoxStyle;
  rounded: BoxStyle;
  ascii: BoxStyle;
}

interface BoxStyle {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  title?: TextStyle;
  content?: TextStyle;
}

interface MessageTypeStyles {
  dialogue: TextStyle;
  action: TextStyle;
  description: TextStyle;
  system: TextStyle;
  error: TextStyle;
  success: TextStyle;
  debug: TextStyle;
}

// Configuration types
interface ThemeConfig {
  name: string;
  description?: string;
  extends?: string; // Base theme to extend
  colorScheme?: Partial<ColorScheme>;
  textStyles?: Partial<TextStyles>;
  boxStyles?: Partial<BoxStyles>;
  messageTypes?: Partial<MessageTypeStyles>;
}

type ChalkColor = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray' | 'grey' | 
                  'blackBright' | 'redBright' | 'greenBright' | 'yellowBright' | 'blueBright' | 'magentaBright' | 
                  'cyanBright' | 'whiteBright';

type TextEmphasis = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'dim';
```

### Configuration Management
```typescript
interface StyleConfig {
  defaultTheme: string;
  fallbackTheme: string;
  enableColorDetection: boolean;
  terminalCompatibility: TerminalCompatibility;
  performance: PerformanceSettings;
}

interface TerminalCompatibility {
  colorSupport: 'none' | 'basic' | '256' | 'truecolor';
  unicodeSupport: boolean;
  boxDrawingSupport: boolean;
  emojiSupport: boolean;
}

interface PerformanceSettings {
  enableCaching: boolean;
  maxCacheSize: number;
  precomputeStyles: boolean;
  lazyLoadThemes: boolean;
}
```

## Migration and Compatibility

### Backward Compatibility Layer
```typescript
interface LegacyMessageFormatter {
  // Maintain compatibility with existing message format
  formatLegacyMessage(message: string): string;
  convertToNewFormat(legacyMessage: any): GameMessage;
  
  // Gradual migration helpers
  enableProgressiveEnhancement(): void;
  disableEnhancedFeatures(): void;
}

// Feature flags for gradual rollout
interface FeatureFlags {
  ENHANCED_STYLING: boolean;
  RICH_TEXT_PROCESSING: boolean;
  THEME_MANAGEMENT: boolean;
  COLOR_DETECTION: boolean;
  PERFORMANCE_OPTIMIZATIONS: boolean;
}
```

### Integration Testing APIs
```typescript
interface StyleTestingUtils {
  // Test utilities for styled components
  stripStyles(styledText: string): string;
  extractColors(styledText: string): ChalkColor[];
  validateTheme(theme: GameTheme): ValidationResult;
  mockTerminalCapabilities(capabilities: TerminalCapabilities): void;
  
  // Performance testing
  benchmarkStyleApplication(text: string, iterations: number): BenchmarkResult;
  measureRenderTime(component: React.ComponentType): number;
}
```