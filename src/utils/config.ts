// src/utils/config.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (go up from dist/utils to root)
const envPath = path.resolve(__dirname, '..', '..', '.env');
console.error(`[ConfigManager] Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('[ConfigManager] Error loading .env file:', result.error);
} else {
  console.error('[ConfigManager] Successfully loaded .env file');
  console.error('[ConfigManager] Environment variables:', {
    JIRA_BASE_URL: process.env.JIRA_BASE_URL ? 'SET' : 'NOT SET',
    JIRA_EMAIL: process.env.JIRA_EMAIL ? 'SET' : 'NOT SET',
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN ? 'SET' : 'NOT SET',
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ? 'SET' : 'NOT SET',
  });
}
/**
 * Secure configuration manager for handling sensitive environment variables
 * Prevents credential exposure in logs and provides centralized config management
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private readonly config: Map<string, string> = new Map();
  private readonly requiredKeys: string[] = [
    'JIRA_BASE_URL',
    'JIRA_EMAIL', 
    'JIRA_API_TOKEN',
    'SLACK_BOT_TOKEN'
  ];

  private constructor() {
    this.validateAndLoadConfig();
  }

  /**
   * Validates required environment variables and loads them securely
   * @throws {Error} If required environment variables are missing
   */
  private validateAndLoadConfig(): void {
    const missing: string[] = [];
    
    for (const key of this.requiredKeys) {
      const value = process.env[key];
      
      if (!value || value.trim() === '') {
        missing.push(key);
      } else {
        // Store the value securely
        this.config.set(key, value.trim());
      }
    }
    
    if (missing.length > 0) {
      throw new Error(
        `Missing or empty required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file and ensure all required variables are set.'
      );
    }

    // Validate JIRA_BASE_URL format
    const jiraUrl = this.config.get('JIRA_BASE_URL');
    if (jiraUrl && !this.isValidUrl(jiraUrl)) {
      throw new Error('JIRA_BASE_URL must be a valid URL (e.g., https://your-domain.atlassian.net)');
    }

    // Log successful initialization to file (not console to avoid MCP stdio issues)
  }

  /**
   * Get the singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get a configuration value by key
   * @param key - The configuration key
   * @returns The configuration value
   * @throws {Error} If the key is not found
   */
  public get(key: string): string {
    const value = this.config.get(key);
    if (!value) {
      throw new Error(`Configuration key not found: ${key}`);
    }
    return value;
  }

  /**
   * Get all configuration keys (for debugging)
   * Does not return actual values for security
   */
  public getKeys(): string[] {
    return Array.from(this.config.keys());
  }

  /**
   * Check if a configuration key exists
   */
  public has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Get Jira base URL with trailing slash removed
   */
  public getJiraBaseUrl(): string {
    return this.get('JIRA_BASE_URL').replace(/\/+$/, '');
  }

  /**
   * Get Jira API v3 URL
   */
  public getJiraApiUrl(): string {
    return `${this.getJiraBaseUrl()}/rest/api/3`;
  }

  /**
   * Get Jira Agile API URL
   */
  public getJiraAgileApiUrl(): string {
    return `${this.getJiraBaseUrl()}/rest/agile/1.0`;
  }

  /**
   * Get basic auth header for Jira
   */
  public getJiraAuthHeader(): string {
    const email = this.get('JIRA_EMAIL');
    const token = this.get('JIRA_API_TOKEN');
    return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
  }

  /**
   * Get Slack bot token
   */
  public getSlackToken(): string {
    return this.get('SLACK_BOT_TOKEN');
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mask URL for logging (show only domain)
   */
  private getMaskedUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/***`;
    } catch {
      return '***invalid-url***';
    }
  }

  /**
   * Mask email for logging
   */
  private getMaskedEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***';
    
    const username = parts[0];
    const domain = parts[1];
    
    if (username.length <= 2) {
      return `*@${domain}`;
    }
    
    return `${username[0]}***${username[username.length - 1]}@${domain}`;
  }

  /**
   * Create a safe version of config for logging (no sensitive data)
   */
  public getSafeConfig(): Record<string, string> {
    return {
      JIRA_BASE_URL: this.getMaskedUrl(this.get('JIRA_BASE_URL')),
      JIRA_EMAIL: this.getMaskedEmail(this.get('JIRA_EMAIL')),
      JIRA_API_TOKEN: '***hidden***',
      SLACK_BOT_TOKEN: '***hidden***',
      CONFIGURED_KEYS: this.getKeys().join(', ')
    };
  }
}

// Export a singleton instance
export const config = ConfigManager.getInstance();
