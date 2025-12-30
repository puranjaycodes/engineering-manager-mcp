// src/jira-handler-production.ts
import axios, { AxiosInstance } from 'axios';
import { generateStandupPDF } from './pdf-generator.js';

// Import utilities
import { config } from './utils/config.js';
import {
  validate,
  CreateJiraIssueSchema,
  UpdateJiraIssueSchema,
  SearchJiraIssuesSchema,
  GetSprintIssuesSchema,
  DailyStandupReportSchema,
  GenerateStandupPDFSchema
} from './utils/validation.js';
import { 
  sprintCache, 
  boardCache, 
  CacheKeys 
} from './utils/cache.js';
import { 
  JiraError, 
  ApiError, 
  ErrorHandler, 
  RetryHelper 
} from './utils/errors.js';
import {
  ToolResponse,
  IssueData,
  CategorizedIssue,
  AssigneeReport,
  StandupReport,
  Sprint,
  JiraIssue,
  SprintSummary,
  ErrorCode
} from './types/index.js';
import { logger } from './utils/logger.js';

// ============================================
// API CLIENTS WITH RETRY AND ERROR HANDLING
// ============================================

// Initialize configuration (will throw if missing required vars)
logger.info('Initializing Jira Handler', config.getSafeConfig());

// Standard Jira API client (v3) with retry logic
const jiraClient: AxiosInstance = axios.create({
  baseURL: config.getJiraApiUrl(),
  auth: {
    username: config.get('JIRA_EMAIL'),
    password: config.get('JIRA_API_TOKEN'),
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Agile API client (for boards and sprints)
const jiraAgileClient: AxiosInstance = axios.create({
  baseURL: config.getJiraAgileApiUrl(),
  auth: {
    username: config.get('JIRA_EMAIL'),
    password: config.get('JIRA_API_TOKEN'),
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Add response interceptors for error handling
[jiraClient, jiraAgileClient].forEach(client => {
  client.interceptors.response.use(
    response => response,
    error => {
      throw ApiError.fromAxiosError(error);
    }
  );
});

// ============================================
// TOOL DEFINITIONS
// ============================================

export const jiraTools = [
  {
    name: 'jira_create_issue',
    description: 'Create a new Jira issue',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project key (e.g., "PROJ")' },
        summary: { type: 'string', description: 'Issue summary' },
        description: { type: 'string', description: 'Issue description' },
        issueType: { type: 'string', description: 'Issue type (Bug, Task, Story)' },
        assignee: { type: 'string', description: 'Assignee email (optional)' },
        priority: { type: 'string', description: 'Priority (Highest, High, Medium, Low, Lowest)' },
      },
      required: ['project', 'summary', 'issueType'],
    },
  },
  {
    name: 'jira_search_issues',
    description: 'Note: JQL search is not available on this instance. Use sprint-based tools instead.',
    inputSchema: {
      type: 'object',
      properties: {
        jql: { type: 'string', description: 'JQL query (not functional - API deprecated)' },
        maxResults: { type: 'number', description: 'Maximum results to return' },
      },
      required: ['jql'],
    },
  },
  {
    name: 'jira_update_issue',
    description: 'Update an existing Jira issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
        fields: { type: 'object', description: 'Fields to update' },
      },
      required: ['issueKey', 'fields'],
    },
  },
  {
    name: 'jira_get_sprint_issues',
    description: 'Get issues in current sprint for a board',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: { type: 'number', description: 'Jira board ID' },
      },
      required: ['boardId'],
    },
  },
  {
    name: 'jira_daily_standup_report',
    description: 'Generate daily standup report for stale and overdue tasks in current sprint',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: { type: 'number', description: 'Jira board ID' },
        projectKey: { type: 'string', description: 'Project key to filter (optional)' },
        daysStale: { type: 'number', description: 'Days without update to consider stale (default: 2)' },
        includeUnassigned: { type: 'boolean', description: 'Include unassigned tasks (default: true)' },
      },
      required: ['boardId'],
    },
  },
  {
    name: 'jira_generate_standup_pdf',
    description: 'Generate a PDF report from the daily standup data',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: { type: 'number', description: 'Jira board ID' },
        projectKey: { type: 'string', description: 'Project key to filter (optional)' },
        daysStale: { type: 'number', description: 'Days without update to consider stale (default: 2)' },
        outputPath: { type: 'string', description: 'Output path for the PDF file (optional)' },
      },
      required: ['boardId'],
    },
  }
];

// ============================================
// HELPER FUNCTIONS WITH CACHING
// ============================================

/**
 * Get the active sprint for a board (with caching)
 */
async function getActiveSprint(boardId: number): Promise<Sprint | null> {
  const cacheKey = CacheKeys.sprint(boardId);
  
  // Try cache first
  const cached = sprintCache.get<Sprint>(cacheKey);
  if (cached) {
    logger.debug('Cache hit for sprint', { boardId });
    return cached;
  }

  // Fetch with retry
  const response = await RetryHelper.retry(
    async () => {
      return await jiraAgileClient.get(`/board/${boardId}/sprint`, {
        params: { state: 'active' }
      });
    },
    { maxAttempts: 3, initialDelay: 1000 }
  );

  const sprint = response.data.values?.[0] || null;
  
  if (sprint) {
    // Cache for 10 minutes
    sprintCache.set(cacheKey, sprint, 600);
  }
  
  return sprint;
}

/**
 * Get all tickets in a sprint (with pagination)
 */
async function* getSprintTicketsPaginated(
  sprintId: number, 
  pageSize: number = 50
): AsyncGenerator<JiraIssue[]> {
  let startAt = 0;
  let total = 0;
  
  do {
    const response = await RetryHelper.retry(
      async () => {
        return await jiraAgileClient.get(`/sprint/${sprintId}/issue`, {
          params: { 
            startAt,
            maxResults: pageSize,
            fields: 'summary,status,assignee,updated,duedate,priority,labels,project,comment,created'
          }
        });
      },
      { maxAttempts: 3 }
    );
    
    yield response.data.issues || [];
    
    startAt += pageSize;
    total = response.data.total || 0;
  } while (startAt < total);
}

/**
 * Get all tickets in a sprint (accumulated)
 */
async function getSprintTickets(sprintId: number): Promise<JiraIssue[]> {
  const cacheKey = CacheKeys.sprintIssues(sprintId);
  
  // Try cache first
  const cached = sprintCache.get<JiraIssue[]>(cacheKey);
  if (cached) {
    logger.debug('Cache hit for sprint issues', { sprintId });
    return cached;
  }

  const allIssues: JiraIssue[] = [];
  
  for await (const batch of getSprintTicketsPaginated(sprintId)) {
    allIssues.push(...batch);
  }
  
  // Cache for 5 minutes
  sprintCache.set(cacheKey, allIssues, 300);
  
  return allIssues;
}

/**
 * Extract comment text from Jira comment object
 */
function extractCommentText(commentBody: any): string {
  if (!commentBody) return 'No text content';
  
  if (typeof commentBody === 'string') {
    return commentBody.substring(0, 200);
  }
  
  // Handle ADF (Atlassian Document Format)
  if (commentBody.content?.[0]?.content?.[0]?.text) {
    return commentBody.content[0].content[0].text.substring(0, 200);
  }
  
  return 'No text content';
}

/**
 * Categorize issue status
 */
function categorizeStatus(status: string): 'completed' | 'inProgress' | 'todo' {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'done' || statusLower === 'closed' || statusLower === 'resolved') {
    return 'completed';
  }
  
  if (statusLower.includes('progress') || statusLower.includes('review') || statusLower.includes('testing')) {
    return 'inProgress';
  }
  
  return 'todo';
}

/**
 * Process issue into IssueData format
 */
function processIssue(issue: JiraIssue, baseUrl: string, daysStale: number): CategorizedIssue {
  const status = issue.fields?.status?.name || 'Unknown';
  const statusLower = status.toLowerCase();
  const updated = issue.fields?.updated || issue.fields?.created || '';
  const duedate = issue.fields?.duedate || null;
  
  // Calculate days since update
  let daysSinceUpdate = 0;
  if (updated) {
    daysSinceUpdate = Math.floor(
      (new Date().getTime() - new Date(updated).getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  
  // Extract last comment
  let lastComment = null;
  if (issue.fields?.comment?.comments && issue.fields.comment.comments.length > 0) {
    const comments = issue.fields.comment.comments;
    const comment = comments[comments.length - 1];
    lastComment = {
      author: comment.author?.displayName || 'Unknown',
      created: comment.created || '',
      body: extractCommentText(comment.body)
    };
  }
  
  // Determine categories
  const categories: Array<'stale' | 'overdue' | 'unassigned' | 'blocked'> = [];
  const isCompleted = categorizeStatus(status) === 'completed';
  
  if (!isCompleted) {
    if (daysSinceUpdate > daysStale) categories.push('stale');
    if (duedate && new Date(duedate) < new Date()) categories.push('overdue');
    if (!issue.fields?.assignee) categories.push('unassigned');
    
    const labels = issue.fields?.labels || [];
    if (labels.includes('blocked') || labels.includes('impediment') || statusLower.includes('blocked')) {
      categories.push('blocked');
    }
  }
  
  return {
    key: issue.key,
    summary: issue.fields?.summary || 'No summary',
    status,
    assignee: issue.fields?.assignee?.displayName || 'Unassigned',
    assigneeEmail: issue.fields?.assignee?.emailAddress || null,
    updated,
    duedate,
    priority: issue.fields?.priority?.name || 'None',
    daysSinceUpdate,
    url: `${baseUrl}/browse/${issue.key}`,
    labels: issue.fields?.labels || [],
    lastComment,
    categories
  };
}

// ============================================
// MAIN HANDLER WITH VALIDATION AND ERROR HANDLING
// ============================================

export async function handleJiraTool(name: string, args: any): Promise<ToolResponse> {
  try {
    switch (name) {
      // ============================================
      // CREATE ISSUE
      // ============================================
      case 'jira_create_issue': {
        // Validate input
        const validatedArgs = validate(CreateJiraIssueSchema, args);
        
        const issueData = {
          fields: {
            project: { key: validatedArgs.project },
            summary: validatedArgs.summary,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: validatedArgs.description || '',
                    },
                  ],
                },
              ],
            },
            issuetype: { name: validatedArgs.issueType },
            ...(validatedArgs.priority && { priority: { name: validatedArgs.priority } }),
            ...(validatedArgs.assignee && { assignee: { emailAddress: validatedArgs.assignee } }),
          },
        };

        const response = await RetryHelper.retry(
          async () => await jiraClient.post('/issue', issueData),
          { maxAttempts: 3 }
        );
        
        logger.info('Issue created', { key: response.data.key });
        
        return {
          content: [{
            type: 'text',
            text: `Created issue: ${response.data.key}\nURL: ${config.getJiraBaseUrl()}/browse/${response.data.key}`,
          }],
        };
      }

      // ============================================
      // SEARCH ISSUES (DEPRECATED)
      // ============================================
      case 'jira_search_issues': {
        // Validate input even though it's deprecated
        validate(SearchJiraIssuesSchema, args);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'JQL search is not available',
              message: 'The Jira search API has been deprecated on this instance.',
              alternatives: [
                'Use jira_get_sprint_issues to get issues from a sprint',
                'Use jira_daily_standup_report to get sprint status with filtering'
              ]
            }, null, 2),
          }],
        };
      }

      // ============================================
      // UPDATE ISSUE
      // ============================================
      case 'jira_update_issue': {
        // Validate input
        const validatedArgs = validate(UpdateJiraIssueSchema, args);
        
        await RetryHelper.retry(
          async () => await jiraClient.put(`/issue/${validatedArgs.issueKey}`, {
            fields: validatedArgs.fields,
          }),
          { maxAttempts: 3 }
        );

        // Invalidate cache for this issue
        sprintCache.delete(CacheKeys.issue(validatedArgs.issueKey));
        
        logger.info('Issue updated', { key: validatedArgs.issueKey });

        return {
          content: [{
            type: 'text',
            text: `Updated issue: ${validatedArgs.issueKey}`,
          }],
        };
      }

      // ============================================
      // GET SPRINT TASKS
      // ============================================
      case 'jira_get_sprint_issues': {
        // Validate input
        const validatedArgs = validate(GetSprintIssuesSchema, args);
        
        const activeSprint = await getActiveSprint(validatedArgs.boardId);
        
        if (!activeSprint) {
          throw JiraError.sprintNotFound(validatedArgs.boardId);
        }

        const tasks = await getSprintTickets(activeSprint.id);
        
        const summary: SprintSummary = {
          totalSprintIssues: tasks.length,
          completedIssues: 0,
          inProgressIssues: 0,
          todoIssues: 0,
          projectFiltered: false,
          projectKey: null
        };

        const byStatus: Record<string, number> = {};
        const byAssignee: Record<string, number> = {};

        tasks.forEach((issue: JiraIssue) => {
          const status = issue.fields?.status?.name || 'Unknown';
          const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
          
          byStatus[status] = (byStatus[status] || 0) + 1;
          byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
          
          const category = categorizeStatus(status);
          if (category === 'completed') summary.completedIssues++;
          else if (category === 'inProgress') summary.inProgressIssues++;
          else summary.todoIssues++;
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              sprintName: activeSprint.name,
              totalIssues: tasks.length,
              byStatus,
              byAssignee,
              summary
            }, null, 2),
          }],
        };
      }

      // ============================================
      // DAILY STANDUP REPORT
      // ============================================
      case 'jira_daily_standup_report': {
        // Validate input
        const validatedArgs = validate(DailyStandupReportSchema, args);
        const daysStale = validatedArgs.daysStale || 2;
        
        // Check cache first
        const cacheKey = CacheKeys.standupReport(validatedArgs.boardId, validatedArgs.projectKey);
        const cachedReport = sprintCache.get<StandupReport>(cacheKey);
        if (cachedReport) {
          logger.debug('Returning cached standup report');
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(cachedReport, null, 2),
            }],
          };
        }
        
        // Get active sprint
        const activeSprint = await getActiveSprint(validatedArgs.boardId);
        
        if (!activeSprint) {
          throw JiraError.sprintNotFound(validatedArgs.boardId);
        }

        logger.info('Processing sprint', { sprint: activeSprint.name, id: activeSprint.id });

        // Get all sprint issues
        const issues = await getSprintTickets(activeSprint.id);
        logger.info('Found issues', { count: issues.length });

        // Initialize report
        const report: StandupReport = {
          sprintName: activeSprint.name,
          sprintId: activeSprint.id,
          date: new Date().toISOString().split('T')[0],
          staleIssues: [],
          overdueIssues: [],
          unassignedIssues: [],
          blockedIssues: [],
          byAssignee: {},
          summary: {
            totalSprintIssues: 0,
            completedIssues: 0,
            inProgressIssues: 0,
            todoIssues: 0,
            projectFiltered: !!validatedArgs.projectKey,
            projectKey: validatedArgs.projectKey || null
          }
        };

        // Process each issue
        issues.forEach((issue: JiraIssue) => {
          // Filter by project if specified
          if (validatedArgs.projectKey && issue.fields?.project?.key !== validatedArgs.projectKey) {
            return;
          }
          
          report.summary.totalSprintIssues++;
          
          const processedIssue = processIssue(issue, config.getJiraBaseUrl(), daysStale);
          const statusCategory = categorizeStatus(processedIssue.status);
          
          // Update status counts
          if (statusCategory === 'completed') {
            report.summary.completedIssues++;
            return; // Skip completed issues for problem detection
          } else if (statusCategory === 'inProgress') {
            report.summary.inProgressIssues++;
          } else {
            report.summary.todoIssues++;
          }
          
          // Remove categories for the base IssueData
          const { categories, ...issueData } = processedIssue;
          
          // Add to appropriate categories
          if (categories.includes('stale')) {
            report.staleIssues.push(issueData);
          }
          if (categories.includes('overdue')) {
            report.overdueIssues.push(issueData);
          }
          if (categories.includes('unassigned')) {
            report.unassignedIssues.push(issueData);
          }
          if (categories.includes('blocked')) {
            report.blockedIssues.push(issueData);
          }
          
          // Group by assignee
          const assigneeKey = processedIssue.assignee;
          if (!report.byAssignee[assigneeKey]) {
            report.byAssignee[assigneeKey] = {
              name: assigneeKey,
              email: processedIssue.assigneeEmail,
              issues: [],
              staleCount: 0,
              overdueCount: 0
            };
          }
          
          report.byAssignee[assigneeKey].issues.push(issueData);
          if (categories.includes('stale')) {
            report.byAssignee[assigneeKey].staleCount++;
          }
          if (categories.includes('overdue')) {
            report.byAssignee[assigneeKey].overdueCount++;
          }
        });

        // Sort issues for better readability
        report.staleIssues.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
        report.overdueIssues.sort((a, b) => (a.duedate || '').localeCompare(b.duedate || ''));

        logger.info('Report summary', {
          stale: report.staleIssues.length,
          overdue: report.overdueIssues.length,
          unassigned: report.unassignedIssues.length,
          blocked: report.blockedIssues.length
        });

        // Cache the report for 5 minutes
        sprintCache.set(cacheKey, report, 300);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(report, null, 2),
          }],
        };
      }

      // ============================================
      // GENERATE STANDUP PDF
      // ============================================
      case 'jira_generate_standup_pdf': {
        // Validate input
        const validatedArgs = validate(GenerateStandupPDFSchema, args);
        
        // First, get the standup report data
        const reportResponse = await handleJiraTool('jira_daily_standup_report', {
          boardId: validatedArgs.boardId,
          projectKey: validatedArgs.projectKey,
          daysStale: validatedArgs.daysStale || 2,
          includeUnassigned: true
        });
        
        const reportData = JSON.parse(reportResponse.content[0].text);
        
        // Check if we got valid data
        if (reportData.error) {
          throw new ApiError(
            'Failed to generate report data',
            ErrorCode.INTERNAL_ERROR,
            500,
            undefined,
            undefined,
            reportData
          );
        }
        
        // Generate PDF
        logger.info('Generating PDF report');
        const pdfPath = await generateStandupPDF(reportData, validatedArgs.outputPath);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'PDF report generated successfully',
              filePath: pdfPath,
              reportSummary: {
                sprint: reportData.sprintName,
                date: reportData.date,
                totalIssues: reportData.summary.totalSprintIssues,
                overdueCount: reportData.overdueIssues?.length || 0,
                staleCount: reportData.staleIssues?.length || 0
              }
            }, null, 2),
          }],
        };
      }

      default:
        throw new ApiError(
          `Unknown Jira tool: ${name}`,
          ErrorCode.UNKNOWN_TOOL,
          400
        );
    }
  } catch (error) {
    // Use the centralized error handler
    const errorResponse = ErrorHandler.handle(error, name);
    logger.error('Tool execution failed', { tool: name, error: errorResponse });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2),
      }],
    };
  }
}
