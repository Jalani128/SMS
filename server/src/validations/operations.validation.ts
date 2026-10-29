import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
  category: z
    .enum(['attendance', 'fees', 'academic', 'administrative', 'maintenance', 'general'], {
      message: 'Invalid task category',
    })
    .default('general'),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent'], {
      message: 'Invalid task priority',
    })
    .default('medium'),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid due date format',
    })
    .optional(),
  assignedTo: z
    .string()
    .regex(objectIdRegex, 'Assignee must be a valid 24-character hex ID'),
  relatedEntity: z
    .object({
      entityType: z.enum(['class', 'student', 'invoice', 'exam', 'homework', 'other']).optional(),
      entityId: z.string().optional(),
    })
    .optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled'], {
    message: 'Status must be pending, in_progress, completed, or cancelled',
  }),
  completionNotes: z
    .string()
    .trim()
    .max(1000, 'Completion notes cannot exceed 1000 characters')
    .optional(),
});

export const createApprovalSchema = z.object({
  type: z.enum(
    [
      'staff_activation',
      'student_record_correction',
      'fee_concession',
      'exam_mark_correction',
      'general_request',
    ],
    { message: 'Invalid approval type' }
  ),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
  reason: z
    .string()
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(1000, 'Reason cannot exceed 1000 characters'),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent'], {
      message: 'Invalid priority',
    })
    .default('medium'),
  targetModel: z
    .enum(['User', 'Student', 'Invoice', 'Mark', 'StudentConcession', 'Other'])
    .optional()
    .default('Other'),
  targetId: z.string().optional(),
  payload: z.record(z.string(), z.any()).optional().default({}),
});

export const reviewApprovalSchema = z
  .object({
    action: z.enum(['approved', 'rejected'], {
      message: 'Action must be approved or rejected',
    }),
    reviewNotes: z
      .string()
      .trim()
      .max(1000, 'Review notes cannot exceed 1000 characters')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'rejected') {
        return !!data.reviewNotes && data.reviewNotes.trim().length >= 3;
      }
      return true;
    },
    {
      message: 'Review notes explaining the reason are required when rejecting an approval request',
      path: ['reviewNotes'],
    }
  );

export const runAutomationSchema = z.object({
  types: z
    .array(z.enum(['attendance', 'fees', 'homework']))
    .optional()
    .default(['attendance', 'fees', 'homework']),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type ReviewApprovalInput = z.infer<typeof reviewApprovalSchema>;
export type RunAutomationInput = z.infer<typeof runAutomationSchema>;
