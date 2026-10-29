import { Schema, Query, Types } from 'mongoose';

export interface SoftDeleteDocument {
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  softDelete(userId?: Types.ObjectId): Promise<this>;
  restore(): Promise<this>;
}

export const softDeletePlugin = (schema: Schema) => {
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

  const applySoftDeleteFilter = function (this: Query<any, any>) {
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

  schema.methods.softDelete = async function (this: any, userId?: Types.ObjectId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (userId) {
      this.deletedBy = userId;
    }
    return this.save();
  };

  schema.methods.restore = async function (this: any) {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };
};
