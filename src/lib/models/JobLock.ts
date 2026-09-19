import mongoose, { Schema, type Model } from "mongoose";

/** One document per background job; used as a cross-instance throttle/lock. */
const JobLockSchema = new Schema(
  {
    _id: { type: String, required: true },
    lastRunAt: { type: Date, default: null },
    lastResult: { type: Schema.Types.Mixed, default: null },
  },
  { versionKey: false }
);

export interface JobLockDoc {
  _id: string;
  lastRunAt: Date | null;
  lastResult: unknown;
}

export const JobLock: Model<JobLockDoc> =
  (mongoose.models.JobLock as Model<JobLockDoc>) || mongoose.model<JobLockDoc>("JobLock", JobLockSchema);
