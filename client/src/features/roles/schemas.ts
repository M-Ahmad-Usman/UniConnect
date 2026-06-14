import { z } from 'zod';

export const assignRoleFormSchema = z
  .object({
    userPublicId: z.uuid('Select a user'),
    role: z.enum([
      'hod',
      'program_director',
      'cr',
      'server_moderator',
      'channel_moderator',
    ]),
    scopeId: z.coerce.number().int().positive().optional(),
    classPublicId: z.uuid().optional(),
    serverPublicId: z.uuid().optional(),
    channelPublicId: z.uuid().optional(),
    expiresAt: z.iso.datetime().nullable().optional(),
  })
  .superRefine((values, context) => {
    if (values.role === 'server_moderator' && !values.serverPublicId) {
      context.addIssue({ code: 'custom', path: ['serverPublicId'], message: 'Select a server' });
    } else if (values.role === 'channel_moderator') {
      if (!values.serverPublicId)
        context.addIssue({ code: 'custom', path: ['serverPublicId'], message: 'Select a server' });
      if (!values.channelPublicId)
        context.addIssue({
          code: 'custom',
          path: ['channelPublicId'],
          message: 'Select a channel',
        });
    } else if (values.role === 'cr' && !values.classPublicId) {
      context.addIssue({ code: 'custom', path: ['classPublicId'], message: 'Select a class' });
    } else if (!values.scopeId) {
      context.addIssue({ code: 'custom', path: ['scopeId'], message: 'Select a scope' });
    }
  });

export type AssignRoleFormValues = z.output<typeof assignRoleFormSchema>;
