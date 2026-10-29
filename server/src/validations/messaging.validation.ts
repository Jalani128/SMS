import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createConversationSchema = z.object({
  recipientId: z.string().regex(objectIdRegex, 'Valid recipient ObjectId is required'),
  type: z.enum(['direct', 'group', 'class_channel']).default('direct'),
  title: z.string().max(100, 'Title cannot exceed 100 characters').optional(),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message content cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters'),
  messageType: z.enum(['text', 'system']).default('text'),
  idempotencyKey: z.string().trim().max(100).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().url(),
        fileType: z.string().trim().min(1),
        sizeBytes: z.number().positive(),
        storageKey: z.string().optional(),
      })
    )
    .optional(),
});

export const editMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Edited message content cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters'),
});

export const queryMessagesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  before: z.string().datetime().optional(),
});
