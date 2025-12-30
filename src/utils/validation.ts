// src/utils/validation.ts
import { z } from 'zod';

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  /**
   * Get formatted error messages for user display
   */
  public getFormattedErrors(): string[] {
    return this.errors.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
  }
}

// ============================================
// JIRA VALIDATION SCHEMAS
// ============================================

/**
 * Valid Jira project key format (2-10 uppercase letters)
 */
const JiraProjectKeySchema = z.string()
  .regex(/^[A-Z]{2,10}$/, 'Project key must be 2-10 uppercase letters');

/**
 * Valid Jira issue key format (PROJECT-NUMBER)
 */
const JiraIssueKeySchema = z.string()
  .regex(/^[A-Z]{2,10}-\d+$/, 'Issue key must be in format PROJECT-123');

/**
 * Valid email format
 */
const EmailSchema = z.string().email('Invalid email address').optional();

/**
 * Priority levels
 */
const PrioritySchema = z.enum(['Highest', 'High', 'Medium', 'Low', 'Lowest']).optional();

/**
 * Issue types
 */
const IssueTypeSchema = z.enum(['Bug', 'Task', 'Story', 'Epic', 'Sub-task']);

/**
 * Schema for creating a Jira issue
 */
export const CreateJiraIssueSchema = z.object({
  project: JiraProjectKeySchema,
  summary: z.string()
    .min(1, 'Summary is required')
    .max(255, 'Summary must be less than 255 characters'),
  description: z.string()
    .max(32768, 'Description must be less than 32KB')
    .optional(),
  issueType: IssueTypeSchema,
  assignee: EmailSchema,
  priority: PrioritySchema,
}).strict();

/**
 * Schema for updating a Jira issue
 */
export const UpdateJiraIssueSchema = z.object({
  issueKey: JiraIssueKeySchema,
  fields: z.object({
    summary: z.string().min(1).max(255).optional(),
    description: z.any().optional(), // Can be string or ADF format
    priority: z.object({ name: PrioritySchema }).optional(),
    assignee: z.object({ emailAddress: EmailSchema }).optional(),
    status: z.object({ name: z.string() }).optional(),
  }).refine(obj => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided to update'
  })
}).strict();

/**
 * Schema for searching Jira issues (deprecated but validated)
 */
export const SearchJiraIssuesSchema = z.object({
  jql: z.string()
    .min(1, 'JQL query is required')
    .max(2000, 'JQL query is too long'),
  maxResults: z.number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .optional(),
}).strict();

/**
 * Schema for getting sprint issues
 */
export const GetSprintIssuesSchema = z.object({
  boardId: z.number()
    .int()
    .positive('Board ID must be a positive integer'),
}).strict();

/**
 * Schema for daily standup report
 */
export const DailyStandupReportSchema = z.object({
  boardId: z.number()
    .int()
    .positive('Board ID must be a positive integer'),
  projectKey: JiraProjectKeySchema.optional(),
  daysStale: z.number()
    .int()
    .min(1)
    .max(30)
    .default(2)
    .optional(),
  includeUnassigned: z.boolean().default(true).optional(),
}).strict();

/**
 * Schema for generating standup PDF
 */
export const GenerateStandupPDFSchema = z.object({
  boardId: z.number()
    .int()
    .positive('Board ID must be a positive integer'),
  projectKey: JiraProjectKeySchema.optional(),
  daysStale: z.number()
    .int()
    .min(1)
    .max(30)
    .default(2)
    .optional(),
  outputPath: z.string()
    .regex(/^[\w\-\/\.]+\.pdf$/, 'Output path must end with .pdf')
    .optional(),
}).strict();

// ============================================
// SLACK VALIDATION SCHEMAS
// ============================================

/**
 * Slack channel format (can be #channel-name or channel ID)
 */
const SlackChannelSchema = z.string()
  .regex(/^([#@][\w-]+|[A-Z0-9]{9,})$/, 'Invalid Slack channel format');

/**
 * Slack timestamp format
 */
const SlackTimestampSchema = z.string()
  .regex(/^\d{10}\.\d{6}$/, 'Invalid Slack timestamp format')
  .optional();

/**
 * Schema for posting a Slack message
 */
export const PostSlackMessageSchema = z.object({
  channel: SlackChannelSchema,
  text: z.string()
    .min(1, 'Message text is required')
    .max(40000, 'Message text is too long (max 40,000 characters)'),
  threadTs: SlackTimestampSchema,
}).strict();

/**
 * Schema for creating a Slack reminder
 */
export const CreateSlackReminderSchema = z.object({
  text: z.string()
    .min(1, 'Reminder text is required')
    .max(1000, 'Reminder text is too long'),
  time: z.string()
    .min(1, 'Time is required')
    .max(100, 'Time string is too long'),
  user: z.string()
    .regex(/^[A-Z0-9]{9,}$/, 'Invalid user ID format')
    .optional(),
}).strict();

/**
 * Schema for getting Slack channel history
 */
export const GetSlackChannelHistorySchema = z.object({
  channel: z.string()
    .regex(/^[A-Z0-9]{9,}$/, 'Channel must be a channel ID'),
  limit: z.number()
    .int()
    .min(1)
    .max(1000)
    .default(10)
    .optional(),
}).strict();

/**
 * Schema for scheduling a Slack message
 */
export const ScheduleSlackMessageSchema = z.object({
  channel: SlackChannelSchema,
  text: z.string()
    .min(1, 'Message text is required')
    .max(40000, 'Message text is too long'),
  postAt: z.number()
    .int()
    .positive('Post time must be a positive Unix timestamp')
    .refine(
      (timestamp) => timestamp > Math.floor(Date.now() / 1000),
      'Post time must be in the future'
    ),
}).strict();

// ============================================
// VALIDATION HELPER FUNCTIONS
// ============================================

/**
 * Validates input against a schema and returns typed result
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws {ValidationError} If validation fails
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Input validation failed',
        error
      );
    }
    throw error;
  }
}

/**
 * Safely validates input and returns result with error
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with either data or error
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: new ValidationError('Input validation failed', error)
      };
    }
    throw error;
  }
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DOS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized;
}

/**
 * Sanitize JQL query to prevent injection
 */
export function sanitizeJQL(jql: string): string {
  // Basic JQL sanitization
  let sanitized = sanitizeString(jql);
  
  // Remove potentially dangerous characters while keeping JQL syntax
  // This is a basic implementation - enhance based on your needs
  sanitized = sanitized.replace(/[;<>]/g, '');
  
  return sanitized;
}

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateJiraIssueInput = z.infer<typeof CreateJiraIssueSchema>;
export type UpdateJiraIssueInput = z.infer<typeof UpdateJiraIssueSchema>;
export type SearchJiraIssuesInput = z.infer<typeof SearchJiraIssuesSchema>;
export type GetSprintIssuesInput = z.infer<typeof GetSprintIssuesSchema>;
export type DailyStandupReportInput = z.infer<typeof DailyStandupReportSchema>;
export type GenerateStandupPDFInput = z.infer<typeof GenerateStandupPDFSchema>;

export type PostSlackMessageInput = z.infer<typeof PostSlackMessageSchema>;
export type CreateSlackReminderInput = z.infer<typeof CreateSlackReminderSchema>;
export type GetSlackChannelHistoryInput = z.infer<typeof GetSlackChannelHistorySchema>;
export type ScheduleSlackMessageInput = z.infer<typeof ScheduleSlackMessageSchema>;
