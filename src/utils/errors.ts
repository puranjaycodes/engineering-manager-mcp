// src/utils/errors.ts
import { ErrorCode, ErrorResponse } from '../types/index.js';
import { AxiosError } from 'axios';

/**
 * Base error class for all application errors
 */
export abstract class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode?: number,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to response format
   */
  public toResponse(tool?: string): ErrorResponse {
    return {
      error: this.message,
      tool: tool || 'unknown',
      status: this.statusCode,
      details: {
        code: this.code,
        timestamp: this.timestamp.toISOString(),
        ...(process.env.NODE_ENV === 'development' ? { context: this.context } : {})
      }
    };
  }

  /**
   * Convert to JSON for logging
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Configuration error - thrown when required config is missing or invalid
 */
export class ConfigError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.CONFIG_INVALID, 500, context);
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends BaseError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    errors: Array<{ field: string; message: string }>,
    context?: Record<string, any>
  ) {
    super(message, ErrorCode.VALIDATION_FAILED, 400, context);
    this.errors = errors;
  }

  public toResponse(tool?: string): ErrorResponse {
    const response = super.toResponse(tool);
    response.details = {
      ...response.details,
      validationErrors: this.errors
    };
    return response;
  }
}

/**
 * API error - thrown when external API calls fail
 */
export class ApiError extends BaseError {
  public readonly endpoint?: string;
  public readonly method?: string;
  public readonly responseData?: any;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode?: number,
    endpoint?: string,
    method?: string,
    responseData?: any,
    context?: Record<string, any>
  ) {
    super(message, code, statusCode, context);
    this.endpoint = endpoint;
    this.method = method;
    this.responseData = responseData;
  }

  /**
   * Create from Axios error
   */
  public static fromAxiosError(error: AxiosError, customMessage?: string): ApiError {
    const statusCode = error.response?.status;
    const endpoint = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    
    let code = ErrorCode.API_ERROR;
    let message = customMessage || 'API request failed';
    
    // Map status codes to error codes
    switch (statusCode) {
      case 401:
        code = ErrorCode.API_UNAUTHORIZED;
        message = customMessage || 'Authentication failed';
        break;
      case 404:
        code = ErrorCode.API_NOT_FOUND;
        message = customMessage || 'Resource not found';
        break;
      case 429:
        code = ErrorCode.API_RATE_LIMIT;
        message = customMessage || 'Rate limit exceeded';
        break;
      case 408:
      case 504:
        code = ErrorCode.API_TIMEOUT;
        message = customMessage || 'Request timed out';
        break;
      default:
        if (error.response?.data) {
          // Try to extract error message from response
          const data = error.response.data as any;
          if (data.errorMessages?.length > 0) {
            message = data.errorMessages.join(', ');
          } else if (data.message) {
            message = data.message;
          } else if (data.error) {
            message = data.error;
          }
        }
    }
    
    return new ApiError(
      message,
      code,
      statusCode,
      endpoint,
      method,
      error.response?.data,
      {
        headers: error.response?.headers,
        config: {
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout
        }
      }
    );
  }
}

/**
 * Jira-specific errors
 */
export class JiraError extends ApiError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode?: number,
    context?: Record<string, any>
  ) {
    super(message, code, statusCode, undefined, undefined, undefined, context);
  }

  public static boardNotFound(boardId: number): JiraError {
    return new JiraError(
      `Board with ID ${boardId} not found`,
      ErrorCode.JIRA_BOARD_NOT_FOUND,
      404,
      { boardId }
    );
  }

  public static sprintNotFound(boardId: number): JiraError {
    return new JiraError(
      `No active sprint found for board ${boardId}`,
      ErrorCode.JIRA_SPRINT_NOT_FOUND,
      404,
      { boardId }
    );
  }

  public static issueNotFound(issueKey: string): JiraError {
    return new JiraError(
      `Issue ${issueKey} not found`,
      ErrorCode.JIRA_ISSUE_NOT_FOUND,
      404,
      { issueKey }
    );
  }

  public static permissionDenied(resource: string): JiraError {
    return new JiraError(
      `Permission denied for ${resource}`,
      ErrorCode.JIRA_PERMISSION_DENIED,
      403,
      { resource }
    );
  }
}

/**
 * Slack-specific errors
 */
export class SlackError extends ApiError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode?: number,
    context?: Record<string, any>
  ) {
    super(message, code, statusCode, undefined, undefined, undefined, context);
  }

  public static channelNotFound(channel: string): SlackError {
    return new SlackError(
      `Channel ${channel} not found`,
      ErrorCode.SLACK_CHANNEL_NOT_FOUND,
      404,
      { channel }
    );
  }

  public static userNotFound(user: string): SlackError {
    return new SlackError(
      `User ${user} not found`,
      ErrorCode.SLACK_USER_NOT_FOUND,
      404,
      { user }
    );
  }

  public static messageTooLong(length: number): SlackError {
    return new SlackError(
      `Message too long (${length} characters, max 40000)`,
      ErrorCode.SLACK_MESSAGE_TOO_LONG,
      400,
      { length, maxLength: 40000 }
    );
  }

  public static rateLimited(retryAfter?: number): SlackError {
    return new SlackError(
      `Slack API rate limit exceeded${retryAfter ? `, retry after ${retryAfter} seconds` : ''}`,
      ErrorCode.SLACK_RATE_LIMITED,
      429,
      { retryAfter }
    );
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle and format errors consistently
   */
  public static handle(error: unknown, tool: string): ErrorResponse {
    // If it's already our custom error
    if (error instanceof BaseError) {
      console.error(`[${tool}] ${error.code}:`, error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error context:', error.context);
        console.error('Stack:', error.stack);
      }
      return error.toResponse(tool);
    }
    
    // If it's an Axios error
    if (this.isAxiosError(error)) {
      const apiError = ApiError.fromAxiosError(error as AxiosError);
      console.error(`[${tool}] API Error:`, apiError.message);
      return apiError.toResponse(tool);
    }
    
    // If it's a standard Error
    if (error instanceof Error) {
      console.error(`[${tool}] Unexpected error:`, error.message);
      console.error('Stack:', error.stack);
      
      return {
        error: error.message,
        tool,
        status: 500,
        details: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          stack: error.stack
        } : 'An unexpected error occurred'
      };
    }
    
    // Unknown error type
    console.error(`[${tool}] Unknown error:`, error);
    return {
      error: 'An unknown error occurred',
      tool,
      status: 500,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    };
  }

  /**
   * Check if error is an Axios error
   */
  private static isAxiosError(error: unknown): boolean {
    return !!(error && typeof error === 'object' && 'isAxiosError' in error);
  }

  /**
   * Wrap async functions with error handling
   */
  public static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    tool: string
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(this.handle(error, tool), null, 2)
          }]
        };
      }
    }) as T;
  }

  /**
   * Create a user-friendly error message
   */
  public static getUserMessage(error: BaseError): string {
    switch (error.code) {
      case ErrorCode.API_UNAUTHORIZED:
        return 'Authentication failed. Please check your credentials.';
      case ErrorCode.API_RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorCode.API_TIMEOUT:
        return 'The request took too long. Please try again.';
      case ErrorCode.JIRA_BOARD_NOT_FOUND:
        return 'The specified Jira board could not be found.';
      case ErrorCode.JIRA_SPRINT_NOT_FOUND:
        return 'No active sprint found for this board.';
      case ErrorCode.SLACK_CHANNEL_NOT_FOUND:
        return 'The specified Slack channel could not be found.';
      case ErrorCode.VALIDATION_FAILED:
        return 'The provided input is invalid. Please check and try again.';
      default:
        return 'An error occurred while processing your request.';
    }
  }
}

/**
 * Retry helper for transient failures
 */
export class RetryHelper {
  /**
   * Retry an operation with exponential backoff
   */
  public static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      factor?: number;
      shouldRetry?: (error: any, attempt: number) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      factor = 2,
      shouldRetry = (error) => {
        // Retry on network errors and 5xx status codes
        if (error instanceof ApiError) {
          const statusCode = error.statusCode || 0;
          return statusCode >= 500 || statusCode === 429 || error.code === ErrorCode.API_TIMEOUT;
        }
        return false;
      }
    } = options;

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
          throw error;
        }
        
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * factor, maxDelay);
      }
    }

    throw lastError;
  }
}
