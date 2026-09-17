import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SubtaskSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  completed: { type: Boolean, default: false },
});

const TaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 500 },
    notes: { type: String, default: "", maxlength: 10000 },
    priority: { type: Number, enum: [1, 2, 3, 4], default: 4 },
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo" },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    hasTime: { type: Boolean, default: false },
    remindAt: { type: Date, default: null },
    reminderOffset: { type: Number, default: null },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekdays", "weekly", "monthly", "yearly"],
      default: "none",
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    tags: { type: [String], default: [] },
    subtasks: { type: [SubtaskSchema], default: [] },
    order: { type: Number, default: 0 },
    // notification bookkeeping
    reminderSent: { type: Boolean, default: false },
    overdueNotified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TaskSchema.index({ completed: 1, remindAt: 1, reminderSent: 1 });
TaskSchema.index({ completed: 1, dueDate: 1, overdueNotified: 1 });

export type TaskDoc = InferSchemaType<typeof TaskSchema> & { _id: mongoose.Types.ObjectId };

export const TaskModel: Model<TaskDoc> =
  (mongoose.models.Task as Model<TaskDoc>) || mongoose.model<TaskDoc>("Task", TaskSchema);
