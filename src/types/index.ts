// src/types/index.ts

// ============================================
// COMMON TYPES
// ============================================

/**
 * Standard MCP tool response format
 */
export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  error: string;
  tool: string;
  status?: number;
  details?: any;
  args?: any;
}

// ============================================
// JIRA TYPES
// ============================================

/**
 * Jira issue data structure
 */
export interface IssueData {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  assigneeEmail: string | null;
  updated: string;
  duedate: string | null;
  priority: string;
  daysSinceUpdate: number;
  url: string;
  labels: string[];
  lastComment: {
    author: string;
    created: string;
    body: string;
  } | null;
}

/**
 * Extended issue data with categories
 */
export interface CategorizedIssue extends IssueData {
  categories: Array<'stale' | 'overdue' | 'unassigned' | 'blocked'>;
}

/**
 * Assignee report structure
 */
export interface AssigneeReport {
  name: string;
  email: string | null;
  issues: IssueData[];
  staleCount: number;
  overdueCount: number;
}

/**
 * Sprint summary
 */
export interface SprintSummary {
  totalSprintIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  todoIssues: number;
  projectFiltered: boolean;
  projectKey: string | null;
}

/**
 * Complete standup report structure
 */
export interface StandupReport {
  sprintName: string;
  sprintId: number;
  date: string;
  staleIssues: IssueData[];
  overdueIssues: IssueData[];
  unassignedIssues: IssueData[];
  blockedIssues: IssueData[];
  byAssignee: Record<string, AssigneeReport>;
  summary: SprintSummary;
}

/**
 * Sprint information from Jira API
 */
export interface Sprint {
  id: number;
  name: string;
  state: 'active' | 'future' | 'closed';
  startDate?: string;
  endDate?: string;
  originBoardId: number;
}

/**
 * Jira API issue format
 */
export interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    status?: {
      name: string;
      statusCategory?: {
        key: string;
        name: string;
      };
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
      accountId: string;
    } | null;
    updated?: string;
    created?: string;
    duedate?: string | null;
    priority?: {
      name: string;
      id: string;
    };
    labels?: string[];
    project?: {
      key: string;
      name: string;
    };
    comment?: {
      comments: Array<{
        author: {
          displayName: string;
        };
        created: string;
        body: any; // Can be string or ADF format
      }>;
    };
  };
}

/**
 * Jira board information
 */
export interface JiraBoard {
  id: number;
  name: string;
  type: 'scrum' | 'kanban';
  location: {
    projectId: number;
    projectKey: string;
    projectName: string;
  };
}

/**
 * Jira tool names
 */
export type JiraToolName =
  | 'jira_create_issue'
  | 'jira_search_issues'
  | 'jira_update_issue'
  | 'jira_get_sprint_issues'
  | 'jira_daily_standup_report'
  | 'jira_generate_standup_pdf';

// ============================================
// SLACK TYPES
// ============================================

/**
 * Slack message structure
 */
export interface SlackMessage {
  user: string;
  text: string;
  timestamp: string;
  thread_ts?: string;
}

/**
 * Slack channel information
 */
export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_archived: boolean;
}

/**
 * Slack user information
 */
export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  email?: string;
}

/**
 * Slack API response format
 */
export interface SlackApiResponse<T = any> {
  ok: boolean;
  error?: string;
  warning?: string;
  response_metadata?: {
    warnings?: string[];
  };
  data?: T;
}

/**
 * Slack tool names
 */
export type SlackToolName =
  | 'slack_post_message'
  | 'slack_create_reminder'
  | 'slack_get_channel_history'
  | 'slack_schedule_message';

// ============================================
// TOOL HANDLER TYPES
// ============================================

/**
 * Combined tool names
 */
export type ToolName = JiraToolName | SlackToolName;

/**
 * Tool definition for MCP
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool handler function signature
 */
export type ToolHandler<TArgs = any> = (
  name: string,
  args: TArgs
) => Promise<ToolResponse>;

// ============================================
// API CLIENT TYPES
// ============================================

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseURL: string;
  auth?: {
    username: string;
    password: string;
  };
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: {
    retries: number;
    retryDelay: number;
    retryCondition?: (error: any) => boolean;
  };
}

/**
 * API error structure
 */
export interface ApiError {
  message: string;
  code: string;
  statusCode?: number;
  details?: any;
  endpoint?: string;
  method?: string;
}

// ============================================
// CACHE TYPES
// ============================================

/**
 * Cache entry structure
 */
export interface CacheEntry<T = any> {
  data: T;
  expiry: number;
  key: string;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum number of entries
  prefix?: string; // Key prefix for namespacing
}

// ============================================
// PDF GENERATION TYPES
// ============================================

/**
 * PDF generation options
 */
export interface PDFGenerationOptions {
  outputPath?: string;
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

/**
 * PDF template data
 */
export interface PDFTemplateData extends StandupReport {
  formattedDate: string;
  completedPercentage: number;
  inProgressPercentage: number;
  todoPercentage: number;
  overdueCount: number;
  staleCount: number;
  unassignedCount: number;
  blockedCount: number;
  teamMemberCount: number;
  teamMembers: AssigneeReport[];
  daysStale: number;
  generatedAt: string;
  year: number;
}

// ============================================
// ERROR TYPES
// ============================================

/**
 * Custom error types
 */
export enum ErrorCode {
  // Configuration errors
  CONFIG_MISSING = 'CONFIG_MISSING',
  CONFIG_INVALID = 'CONFIG_INVALID',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // API errors
  API_ERROR = 'API_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_NOT_FOUND = 'API_NOT_FOUND',
  
  // Jira specific
  JIRA_BOARD_NOT_FOUND = 'JIRA_BOARD_NOT_FOUND',
  JIRA_SPRINT_NOT_FOUND = 'JIRA_SPRINT_NOT_FOUND',
  JIRA_ISSUE_NOT_FOUND = 'JIRA_ISSUE_NOT_FOUND',
  JIRA_PROJECT_NOT_FOUND = 'JIRA_PROJECT_NOT_FOUND',
  JIRA_PERMISSION_DENIED = 'JIRA_PERMISSION_DENIED',
  
  // Slack specific
  SLACK_CHANNEL_NOT_FOUND = 'SLACK_CHANNEL_NOT_FOUND',
  SLACK_USER_NOT_FOUND = 'SLACK_USER_NOT_FOUND',
  SLACK_MESSAGE_TOO_LONG = 'SLACK_MESSAGE_TOO_LONG',
  SLACK_RATE_LIMITED = 'SLACK_RATE_LIMITED',
  
  // General errors
  UNKNOWN_TOOL = 'UNKNOWN_TOOL',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Custom error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode?: number,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  /**
   * Convert to response format
   */
  public toResponse(): ErrorResponse {
    return {
      error: this.message,
      tool: 'unknown',
      status: this.statusCode,
      details: this.details
    };
  }
}
