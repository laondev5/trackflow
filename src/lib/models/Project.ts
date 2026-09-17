import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProjectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    color: { type: String, default: "#6366f1" },
    icon: { type: String, default: "📁" },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type ProjectDoc = InferSchemaType<typeof ProjectSchema> & { _id: mongoose.Types.ObjectId };

export const ProjectModel: Model<ProjectDoc> =
  (mongoose.models.Project as Model<ProjectDoc>) || mongoose.model<ProjectDoc>("Project", ProjectSchema);
