import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const OperationalTaskSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
        default: '',
    },
    category: {
        type: String,
        enum: {
            values: ['attendance', 'fees', 'academic', 'administrative', 'maintenance', 'general'],
            message: 'Invalid task category',
        },
        default: 'general',
        index: true,
    },
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'urgent'],
            message: 'Invalid task priority',
        },
        default: 'medium',
        index: true,
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'in_progress', 'completed', 'cancelled'],
            message: 'Invalid task status',
        },
        default: 'pending',
        index: true,
    },
    dueDate: {
        type: Date,
        index: true,
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assignee reference is required'],
        index: true,
    },
    assignedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assigner reference is required'],
        index: true,
    },
    completionNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Completion notes cannot exceed 1000 characters'],
    },
    completedAt: {
        type: Date,
    },
    completedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['class', 'student', 'invoice', 'exam', 'homework', 'other'],
        },
        entityId: {
            type: String,
        },
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret.__v;
            return ret;
        },
    },
});
OperationalTaskSchema.index({ schoolId: 1, status: 1, dueDate: 1 });
OperationalTaskSchema.index({ schoolId: 1, assignedTo: 1, status: 1 });
OperationalTaskSchema.index({ schoolId: 1, category: 1 });
OperationalTaskSchema.plugin(tenantIsolationPlugin);
OperationalTaskSchema.plugin(softDeletePlugin);
export const OperationalTask = mongoose.model('OperationalTask', OperationalTaskSchema);
