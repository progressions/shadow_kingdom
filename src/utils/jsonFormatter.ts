/**
 * Enhanced JSON formatter for Grok response logging
 * Creates visually appealing, structured log entries
 */

export class JsonFormatter {
  private static readonly COLORS = {
    RESET: '\x1b[0m',
    BRIGHT: '\x1b[1m',
    DIM: '\x1b[2m',
    
    // Colors
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',
    GRAY: '\x1b[90m',
    
    // Backgrounds
    BG_RED: '\x1b[41m',
    BG_GREEN: '\x1b[42m',
    BG_YELLOW: '\x1b[43m',
    BG_BLUE: '\x1b[44m',
    BG_MAGENTA: '\x1b[45m',
    BG_CYAN: '\x1b[46m',
  };

  /**
   * Format Grok API response with enhanced visual structure
   */
  static formatGrokResponse(logData: any): string {
    const lines: string[] = [];
    
    // Header with timestamp
    lines.push('');
    lines.push(this.createHeader('🤖 GROK API RESPONSE', logData.timestamp));
    
    // Success/Error status
    if (logData.success) {
      lines.push(`${this.COLORS.GREEN}✅ SUCCESS${this.COLORS.RESET}`);
    } else {
      lines.push(`${this.COLORS.RED}❌ ERROR${this.COLORS.RESET}`);
    }
    
    // Endpoint info
    if (logData.endpoint) {
      lines.push(`${this.COLORS.BLUE}📡 Endpoint:${this.COLORS.RESET} ${logData.endpoint}`);
    }
    
    lines.push('');
    
    // Request section
    if (logData.request) {
      lines.push(this.createSectionHeader('📤 REQUEST'));
      lines.push(...this.formatRequest(logData.request));
      lines.push('');
    }
    
    // Response section
    if (logData.response) {
      if (logData.response.error) {
        lines.push(this.createSectionHeader('❌ ERROR RESPONSE'));
        lines.push(`${this.COLORS.RED}Error: ${logData.response.error}${this.COLORS.RESET}`);
      } else {
        lines.push(this.createSectionHeader('📥 RESPONSE'));
        lines.push(...this.formatResponse(logData.response));
      }
      lines.push('');
    }
    
    // Footer
    lines.push(this.createFooter());
    
    return lines.join('\n') + '\n';
  }

  /**
   * Format enhanced command interpretation logs
   */
  static formatCommandInterpretation(logData: any): string {
    const lines: string[] = [];
    
    // Header
    lines.push('');
    lines.push(this.createHeader('🧠 AI COMMAND INTERPRETATION', logData.timestamp));
    
    // Input
    lines.push(`${this.COLORS.CYAN}💬 User Input:${this.COLORS.RESET} "${logData.input}"`);
    lines.push('');
    
    // Prompt (truncated if too long)
    lines.push(this.createSectionHeader('📝 AI PROMPT'));
    const truncatedPrompt = this.truncateText(logData.prompt, 200);
    lines.push(this.indent(truncatedPrompt, 2));
    lines.push('');
    
    // AI Response
    lines.push(this.createSectionHeader('🤖 AI RESPONSE'));
    const truncatedResponse = this.truncateText(logData.aiResponse, 300);
    lines.push(this.indent(truncatedResponse, 2));
    lines.push('');
    
    // Parsed result
    if (logData.parsed) {
      lines.push(this.createSectionHeader('🔧 PARSED RESULT'));
      if (logData.parsed.error) {
        lines.push(`${this.COLORS.RED}❌ Parse Error: ${logData.parsed.error}${this.COLORS.RESET}`);
      } else {
        lines.push(this.indent(JSON.stringify(logData.parsed, null, 2), 2));
      }
      lines.push('');
    }
    
    lines.push(this.createFooter());
    
    return lines.join('\n') + '\n';
  }

  /**
   * Format any JSON data with enhanced structure
   */
  static formatJsonData(data: any): string {
    if (data.type === 'ENHANCED_COMMAND_INTERPRETATION') {
      return this.formatCommandInterpretation(data);
    }
    
    // Check if it looks like a Grok API response
    if (data.endpoint && data.request && data.response !== undefined) {
      return this.formatGrokResponse(data);
    }
    
    // Fallback to enhanced generic formatting
    const lines: string[] = [];
    lines.push('');
    lines.push(this.createHeader('📊 JSON DATA', data.timestamp || new Date().toISOString()));
    lines.push(this.formatGenericJson(data));
    lines.push(this.createFooter());
    
    return lines.join('\n') + '\n';
  }

  private static formatRequest(request: any): string[] {
    const lines: string[] = [];
    
    if (request.model) {
      lines.push(`${this.COLORS.MAGENTA}🤖 Model:${this.COLORS.RESET} ${request.model}`);
    }
    
    if (request.max_tokens) {
      lines.push(`${this.COLORS.YELLOW}🎯 Max Tokens:${this.COLORS.RESET} ${request.max_tokens}`);
    }
    
    if (request.temperature) {
      lines.push(`${this.COLORS.CYAN}🌡️  Temperature:${this.COLORS.RESET} ${request.temperature}`);
    }
    
    if (request.messages && Array.isArray(request.messages)) {
      lines.push(`${this.COLORS.BLUE}💭 Messages:${this.COLORS.RESET} ${request.messages.length} message(s)`);
      
      request.messages.forEach((msg: any, index: number) => {
        const roleColor = msg.role === 'system' ? this.COLORS.GRAY : 
                         msg.role === 'user' ? this.COLORS.GREEN : this.COLORS.BLUE;
        lines.push(`${this.indent(`${roleColor}${index + 1}. [${msg.role}]${this.COLORS.RESET}`, 2)}`);
        
        // Truncate long content
        const content = this.truncateText(msg.content, 150);
        lines.push(this.indent(`${this.COLORS.DIM}${content}${this.COLORS.RESET}`, 4));
      });
    }
    
    return lines;
  }

  private static formatResponse(response: any): string[] {
    const lines: string[] = [];
    
    // Content
    if (response.content) {
      lines.push(`${this.COLORS.GREEN}📝 Content:${this.COLORS.RESET}`);
      const content = this.truncateText(response.content, 400);
      lines.push(this.indent(content, 2));
      lines.push('');
    }
    
    // Usage statistics
    if (response.usage) {
      lines.push(`${this.COLORS.CYAN}📊 Token Usage:${this.COLORS.RESET}`);
      const usage = response.usage;
      
      if (usage.prompt_tokens) {
        lines.push(`${this.indent(`📥 Prompt: ${usage.prompt_tokens}`, 2)}`);
      }
      if (usage.completion_tokens) {
        lines.push(`${this.indent(`📤 Completion: ${usage.completion_tokens}`, 2)}`);
      }
      if (usage.total_tokens) {
        lines.push(`${this.indent(`🔢 Total: ${usage.total_tokens}`, 2)}`);
      }
    }
    
    if (response.finish_reason) {
      lines.push(`${this.COLORS.MAGENTA}🏁 Finish Reason:${this.COLORS.RESET} ${response.finish_reason}`);
    }
    
    return lines;
  }

  private static formatGenericJson(data: any): string {
    return JSON.stringify(data, null, 2)
      .split('\n')
      .map(line => this.indent(line, 1))
      .join('\n');
  }

  private static createHeader(title: string, timestamp?: string): string {
    const width = 100;
    const titleLine = `${this.COLORS.BRIGHT}${this.COLORS.WHITE}${title}${this.COLORS.RESET}`;
    const timestampLine = timestamp ? `${this.COLORS.GRAY}${timestamp}${this.COLORS.RESET}` : '';
    
    const separator = '═'.repeat(width);
    
    return [
      `${this.COLORS.BLUE}${separator}${this.COLORS.RESET}`,
      `${titleLine}${timestampLine ? ` - ${timestampLine}` : ''}`,
      `${this.COLORS.BLUE}${separator}${this.COLORS.RESET}`
    ].join('\n');
  }

  private static createSectionHeader(title: string): string {
    return `${this.COLORS.BRIGHT}${this.COLORS.YELLOW}${title}${this.COLORS.RESET}`;
  }

  private static createFooter(): string {
    const width = 100;
    return `${this.COLORS.BLUE}${'═'.repeat(width)}${this.COLORS.RESET}`;
  }

  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private static indent(text: string, spaces: number): string {
    const prefix = ' '.repeat(spaces);
    return text.split('\n').map(line => prefix + line).join('\n');
  }

  /**
   * Strip ANSI color codes for file output (colors don't work well in files)
   */
  static stripColors(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }
}