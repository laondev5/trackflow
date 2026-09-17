import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PushSubSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: { p256dh: String, auth: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpires: { type: Date, default: null, select: false },
    prefs: {
      theme: { type: String, enum: ["system", "light", "dark"], default: "system" },
      emailReminders: { type: Boolean, default: true },
      overdueAlerts: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: true },
      digestHour: { type: Number, default: 8, min: 0, max: 23 },
      timezone: { type: String, default: "UTC" },
      defaultReminder: { type: Number, default: 15 },
      pushEnabled: { type: Boolean, default: false },
      focusMinutes: { type: Number, default: 25 },
      breakMinutes: { type: Number, default: 5 },
    },
    lastDigestDate: { type: String, default: null }, // YYYY-MM-DD in user's timezone
    pushSubscriptions: { type: [PushSubSchema], default: [] },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);
