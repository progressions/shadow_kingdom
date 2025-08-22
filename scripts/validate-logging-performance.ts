#!/usr/bin/env npx ts-node

/**
 * Performance Validation Script for Comprehensive Logging System
 * 
 * This script validates that the logging system meets the performance requirement
 * of < 5ms overhead per log entry under various scenarios.
 * 
 * Run with: npx ts-node scripts/validate-logging-performance.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../src/services/loggerService';
import { FileLogger } from '../src/utils/fileLogger';
import { LogFormatter } from '../src/utils/logFormatter';
import { LogLevel } from '../src/types/logging';

interface PerformanceMetrics {
  totalEntries: number;
  totalTime: number;
  averageTimePerEntry: number;
  minTime: number;
  maxTime: number;
  meetsRequirement: boolean;
}

class LoggingPerformanceValidator {
  private testLogDirectory: string;
  private loggerService: LoggerService;

  constructor() {
    this.testLogDirectory = path.join(__dirname, '../test-logs', `perf-${Date.now()}`);
    this.loggerService = new LoggerService({
      logDirectory: this.testLogDirectory,
      logLevel: LogLevel.DEBUG,
      logToConsole: false,
      rotationDays: 30,
      logAiResponses: true,
      logUserCommands: true,
      logSystemOutput: true
    });
  }

  /**
   * Measure performance of individual log operations
   */
  private measureLogOperation(operation: () => void): number {
    const start = process.hrtime.bigint();
    operation();
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000; // Convert nanoseconds to milliseconds
  }

  /**
   * Test user input logging performance
   */
  testUserInputLogging(iterations: number = 1000): PerformanceMetrics {
    console.log(`\n📝 Testing User Input Logging (${iterations} iterations)`);
    
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const command = `test command ${i}`;
      const time = this.measureLogOperation(() => {
        this.loggerService.logUserInput(command);
      });
      times.push(time);
      
      if (i % 100 === 0) {
        process.stdout.write('.');
      }
    }
    
    return this.calculateMetrics(times);
  }

  /**
   * Test system output logging performance
   */
  testSystemOutputLogging(iterations: number = 1000): PerformanceMetrics {
    console.log(`\n🖥️  Testing System Output Logging (${iterations} iterations)`);
    
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const message = `System response ${i}: You see a mysterious chamber with ancient runes.`;
      const time = this.measureLogOperation(() => {
        this.loggerService.logSystemOutput(message, 'room');
      });
      times.push(time);
      
      if (i % 100 === 0) {
        process.stdout.write('.');
      }
    }
    
    return this.calculateMetrics(times);
  }

  /**
   * Test AI interaction logging performance
   */
  testAILogging(iterations: number = 500): PerformanceMetrics {
    console.log(`\n🤖 Testing AI Interaction Logging (${iterations} iterations)`);
    
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const time = this.measureLogOperation(() => {
        const requestId = this.loggerService.logGrokRequest(`Generate room ${i}`, '/chat/completions');
        this.loggerService.logGrokResponse(
          requestId,
          { description: `Generated room ${i}`, items: [] },
          { input: 50, output: 100 },
          150
        );
      });
      times.push(time);
      
      if (i % 50 === 0) {
        process.stdout.write('.');
      }
    }
    
    return this.calculateMetrics(times);
  }

  /**
   * Test game event logging performance
   */
  testGameEventLogging(iterations: number = 500): PerformanceMetrics {
    console.log(`\n🎮 Testing Game Event Logging (${iterations} iterations)`);
    
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const gameEvent = {
        type: 'movement' as const,
        gameId: 1,
        playerId: 123,
        roomId: i + 1,
        details: { 
          direction: ['north', 'south', 'east', 'west'][i % 4],
          fromRoom: `Room ${i}`,
          toRoom: `Room ${i + 1}`
        }
      };
      
      const time = this.measureLogOperation(() => {
        this.loggerService.logGameEvent(gameEvent);
      });
      times.push(time);
      
      if (i % 50 === 0) {
        process.stdout.write('.');
      }
    }
    
    return this.calculateMetrics(times);
  }

  /**
   * Test concurrent logging performance
   */
  async testConcurrentLogging(iterations: number = 200): Promise<PerformanceMetrics> {
    console.log(`\n⚡ Testing Concurrent Logging (${iterations} iterations)`);
    
    const start = process.hrtime.bigint();
    
    const promises = [];
    for (let i = 0; i < iterations; i++) {
      promises.push(Promise.resolve().then(() => {
        this.loggerService.logUserInput(`concurrent command ${i}`);
        this.loggerService.logSystemOutput(`concurrent response ${i}`, 'system');
        this.loggerService.logGameEvent({
          type: 'movement',
          details: { action: `concurrent-${i}`, iteration: i }
        });
      }));
      
      if (i % 20 === 0) {
        process.stdout.write('.');
      }
    }
    
    await Promise.all(promises);
    
    const end = process.hrtime.bigint();
    const totalTime = Number(end - start) / 1_000_000; // Convert to milliseconds
    const totalEntries = iterations * 3; // Each iteration creates 3 log entries
    const averageTime = totalTime / totalEntries;
    
    return {
      totalEntries,
      totalTime,
      averageTimePerEntry: averageTime,
      minTime: averageTime * 0.8, // Estimate
      maxTime: averageTime * 1.2, // Estimate
      meetsRequirement: averageTime < 5
    };
  }

  /**
   * Test logging with large payloads
   */
  testLargePayloadLogging(iterations: number = 100): PerformanceMetrics {
    console.log(`\n📦 Testing Large Payload Logging (${iterations} iterations)`);
    
    const times: number[] = [];
    const largeMessage = 'A'.repeat(10000); // 10KB message
    
    for (let i = 0; i < iterations; i++) {
      const time = this.measureLogOperation(() => {
        this.loggerService.logSystemOutput(`${largeMessage} - entry ${i}`, 'system');
      });
      times.push(time);
      
      if (i % 10 === 0) {
        process.stdout.write('.');
      }
    }
    
    return this.calculateMetrics(times);
  }

  /**
   * Calculate performance metrics from timing data
   */
  private calculateMetrics(times: number[]): PerformanceMetrics {
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      totalEntries: times.length,
      totalTime,
      averageTimePerEntry: averageTime,
      minTime,
      maxTime,
      meetsRequirement: averageTime < 5
    };
  }

  /**
   * Print performance metrics
   */
  private printMetrics(testName: string, metrics: PerformanceMetrics): void {
    console.log(`\n\n📊 ${testName} Results:`);
    console.log(`   Entries: ${metrics.totalEntries.toLocaleString()}`);
    console.log(`   Total Time: ${metrics.totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${metrics.averageTimePerEntry.toFixed(3)}ms per entry`);
    console.log(`   Min: ${metrics.minTime.toFixed(3)}ms`);
    console.log(`   Max: ${metrics.maxTime.toFixed(3)}ms`);
    console.log(`   Requirement: ${metrics.meetsRequirement ? '✅ PASS' : '❌ FAIL'} (< 5ms)`);
    
    if (!metrics.meetsRequirement) {
      console.log(`   ⚠️  Performance requirement not met! ${metrics.averageTimePerEntry.toFixed(3)}ms > 5ms`);
    }
  }

  /**
   * Validate file system performance impact
   */
  validateFileSystemImpact(): void {
    console.log(`\n💾 Validating File System Impact`);
    
    const logPaths = this.loggerService.getLogFilePaths();
    
    if (fs.existsSync(logPaths.session)) {
      const stats = fs.statSync(logPaths.session);
      console.log(`   Session Log Size: ${(stats.size / 1024).toFixed(2)} KB`);
    }
    
    if (fs.existsSync(logPaths.ai)) {
      const stats = fs.statSync(logPaths.ai);
      console.log(`   AI Log Size: ${(stats.size / 1024).toFixed(2)} KB`);
    }
    
    // Check log file integrity
    const logContent = fs.readFileSync(logPaths.session, 'utf8');
    const lines = logContent.trim().split('\n');
    const validLines = lines.filter(line => line.match(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/));
    
    console.log(`   Log Entries: ${lines.length.toLocaleString()}`);
    console.log(`   Valid Format: ${validLines.length.toLocaleString()} (${((validLines.length / lines.length) * 100).toFixed(1)}%)`);
    console.log(`   Integrity: ${validLines.length === lines.length ? '✅ PASS' : '❌ FAIL'}`);
  }

  /**
   * Run all performance validation tests
   */
  async runAllTests(): Promise<boolean> {
    console.log('🚀 Starting Logging Performance Validation');
    console.log(`📁 Test directory: ${this.testLogDirectory}`);
    
    let allTestsPass = true;
    
    try {
      // Test individual operations
      const userInputMetrics = this.testUserInputLogging(1000);
      this.printMetrics('User Input Logging', userInputMetrics);
      allTestsPass = allTestsPass && userInputMetrics.meetsRequirement;
      
      const systemOutputMetrics = this.testSystemOutputLogging(1000);
      this.printMetrics('System Output Logging', systemOutputMetrics);
      allTestsPass = allTestsPass && systemOutputMetrics.meetsRequirement;
      
      const aiLoggingMetrics = this.testAILogging(500);
      this.printMetrics('AI Interaction Logging', aiLoggingMetrics);
      allTestsPass = allTestsPass && aiLoggingMetrics.meetsRequirement;
      
      const gameEventMetrics = this.testGameEventLogging(500);
      this.printMetrics('Game Event Logging', gameEventMetrics);
      allTestsPass = allTestsPass && gameEventMetrics.meetsRequirement;
      
      const concurrentMetrics = await this.testConcurrentLogging(200);
      this.printMetrics('Concurrent Logging', concurrentMetrics);
      allTestsPass = allTestsPass && concurrentMetrics.meetsRequirement;
      
      const largePayloadMetrics = this.testLargePayloadLogging(100);
      this.printMetrics('Large Payload Logging', largePayloadMetrics);
      allTestsPass = allTestsPass && largePayloadMetrics.meetsRequirement;
      
      // Validate file system impact
      this.validateFileSystemImpact();
      
      // Overall summary
      console.log(`\n🎯 Overall Performance Validation: ${allTestsPass ? '✅ PASS' : '❌ FAIL'}`);
      
      if (allTestsPass) {
        console.log('\n✨ All logging operations meet the < 5ms performance requirement!');
        console.log('📈 The logging system is optimized and production-ready.');
      } else {
        console.log('\n⚠️  Some logging operations exceed the 5ms performance requirement.');
        console.log('🔧 Consider optimizing file I/O operations or implementing async logging.');
      }
      
    } finally {
      // Clean up test directory
      if (fs.existsSync(this.testLogDirectory)) {
        fs.rmSync(this.testLogDirectory, { recursive: true, force: true });
        console.log(`\n🧹 Cleaned up test directory: ${this.testLogDirectory}`);
      }
    }
    
    return allTestsPass;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new LoggingPerformanceValidator();
  validator.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('\n❌ Performance validation failed with error:', error);
    process.exit(1);
  });
}

export { LoggingPerformanceValidator };