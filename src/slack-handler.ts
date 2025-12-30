// src/slack-handler.ts
import axios, { AxiosInstance } from 'axios';

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;

const slackClient: AxiosInstance = axios.create({
  baseURL: 'https://slack.com/api',
  headers: {
    'Authorization': `Bearer ${SLACK_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

export const slackTools = [
  {
    name: 'slack_post_message',
    description: 'Post a message to a Slack channel',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel ID or name (e.g., "#general")' },
        text: { type: 'string', description: 'Message text' },
        threadTs: { type: 'string', description: 'Thread timestamp for replies (optional)' },
      },
      required: ['channel', 'text'],
    },
  },
  {
    name: 'slack_create_reminder',
    description: 'Create a reminder for yourself or someone else',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Reminder text' },
        time: { type: 'string', description: 'Time (e.g., "in 2 hours", "tomorrow at 9am")' },
        user: { type: 'string', description: 'User ID (optional, defaults to self)' },
      },
      required: ['text', 'time'],
    },
  },
  {
    name: 'slack_get_channel_history',
    description: 'Get recent messages from a channel',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel ID' },
        limit: { type: 'number', description: 'Number of messages to retrieve' },
      },
      required: ['channel'],
    },
  },
  {
    name: 'slack_schedule_message',
    description: 'Schedule a message for later',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel ID or name' },
        text: { type: 'string', description: 'Message text' },
        postAt: { type: 'number', description: 'Unix timestamp when to send' },
      },
      required: ['channel', 'text', 'postAt'],
    },
  },
];

export async function handleSlackTool(name: string, args: any) {
  try {
    switch (name) {
      case 'slack_post_message': {
        const response = await slackClient.post('/chat.postMessage', {
          channel: args.channel,
          text: args.text,
          thread_ts: args.threadTs,
        });

        if (!response.data.ok) {
          throw new Error(response.data.error);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Message posted to ${args.channel}`,
            },
          ],
        };
      }

      case 'slack_create_reminder': {
        const response = await slackClient.post('/reminders.add', {
          text: args.text,
          time: args.time,
          user: args.user,
        });

        if (!response.data.ok) {
          throw new Error(response.data.error);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Reminder created: "${args.text}" at ${args.time}`,
            },
          ],
        };
      }

      case 'slack_get_channel_history': {
        const response = await slackClient.get('/conversations.history', {
          params: {
            channel: args.channel,
            limit: args.limit || 10,
          },
        });

        if (!response.data.ok) {
          throw new Error(response.data.error);
        }

        const messages = response.data.messages.map((msg: any) => ({
          user: msg.user,
          text: msg.text,
          timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(messages, null, 2),
            },
          ],
        };
      }

      case 'slack_schedule_message': {
        const response = await slackClient.post('/chat.scheduleMessage', {
          channel: args.channel,
          text: args.text,
          post_at: args.postAt,
        });

        if (!response.data.ok) {
          throw new Error(response.data.error);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Message scheduled for ${new Date(args.postAt * 1000).toISOString()}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown Slack tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
}
