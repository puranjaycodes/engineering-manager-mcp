// src/utils/logger.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Logger utility for MCP server
 * Writes to file instead of console to avoid interfering with MCP stdio communication
 */
export class Logger {
  private static instance: Logger;
  private logFile: string;
  private debugMode: boolean;

  private constructor() {
    this.debugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
    
   // Get the directory of this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Create logs directory in project root
  const logsDir = path.resolve(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Create log file with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    this.logFile = path.join(logsDir, `mcp-server-${timestamp}.log`);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private writeLog(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    try {
      fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      // Silently fail if logging fails - don't interfere with MCP
    }
  }

  public info(message: string, data?: any): void {
    this.writeLog('INFO', message, data);
  }

  public error(message: string, data?: any): void {
    this.writeLog('ERROR', message, data);
  }

  public warn(message: string, data?: any): void {
    this.writeLog('WARN', message, data);
  }

  public debug(message: string, data?: any): void {
    if (this.debugMode) {
      this.writeLog('DEBUG', message, data);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
