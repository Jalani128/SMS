import { Schema } from 'mongoose';
export const softDeletePlugin = (schema) => {
    schema.add({
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    });
    const applySoftDeleteFilter = function () {
        const currentOptions = this.getOptions();
        if (currentOptions && currentOptions.includeDeleted) {
            return;
        }
        this.where({ isDeleted: { $ne: true } });
    };
    schema.pre('find', applySoftDeleteFilter);
    schema.pre('findOne', applySoftDeleteFilter);
    schema.pre('findOneAndUpdate', applySoftDeleteFilter);
    schema.pre('countDocuments', applySoftDeleteFilter);
    schema.methods.softDelete = async function (userId) {
        this.isDeleted = true;
        this.deletedAt = new Date();
        if (userId) {
            this.deletedBy = userId;
        }
        return this.save();
    };
    schema.methods.restore = async function () {
        this.isDeleted = false;
        this.deletedAt = null;
        this.deletedBy = null;
        return this.save();
    };
};
