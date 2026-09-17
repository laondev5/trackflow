import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["reminder", "overdue", "digest", "system"], required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-clean notifications after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & { _id: mongoose.Types.ObjectId };

export const NotificationModel: Model<NotificationDoc> =
  (mongoose.models.Notification as Model<NotificationDoc>) ||
  mongoose.model<NotificationDoc>("Notification", NotificationSchema);
