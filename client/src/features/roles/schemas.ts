import { z } from 'zod';

export const assignRoleFormSchema = z
  .object({
    userId: z.coerce.number().int().positive('Select a user'),
    role: z.enum([
      'hod',
      'program_director',
      'cr',
      'society_president',
      'society_convenor',
      'server_moderator',
      'channel_moderator',
    ]),
    scopeId: z.coerce.number().int().positive().optional(),
    serverId: z.coerce.number().int().positive().optional(),
    channelId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((values, context) => {
    if (values.role === 'server_moderator' && !values.serverId) {
      context.addIssue({ code: 'custom', path: ['serverId'], message: 'Select a server' });
    } else if (values.role === 'channel_moderator') {
      if (!values.serverId) context.addIssue({ code: 'custom', path: ['serverId'], message: 'Select a server' });
      if (!values.channelId) context.addIssue({ code: 'custom', path: ['channelId'], message: 'Select a channel' });
    } else if (!values.scopeId) {
      context.addIssue({ code: 'custom', path: ['scopeId'], message: 'Select a scope' });
    }
  });

export type AssignRoleFormValues = z.output<typeof assignRoleFormSchema>;
