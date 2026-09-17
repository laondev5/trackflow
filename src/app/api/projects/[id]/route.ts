import { Types } from "mongoose";
import { requireUser } from "@/lib/auth";
import { fail, handler, ok } from "@/lib/api-helpers";
import { ProjectModel, type ProjectDoc } from "@/lib/models/Project";
import { TaskModel } from "@/lib/models/Task";
import { projectUpdateSchema } from "@/lib/validators";
import { serializeProject } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return fail(404, "Project not found");
  const input = projectUpdateSchema.parse(await req.json());
  const project = await ProjectModel.findOneAndUpdate(
    { _id: id, userId: user._id },
    { $set: input },
    { returnDocument: "after" }
  ).lean<ProjectDoc>();
  if (!project) return fail(404, "Project not found");
  return ok({ project: serializeProject(project) });
});

export const DELETE = handler(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return fail(404, "Project not found");
  const deleteTasks = new URL(req.url).searchParams.get("deleteTasks") === "true";
  const res = await ProjectModel.deleteOne({ _id: id, userId: user._id });
  if (!res.deletedCount) return fail(404, "Project not found");
  if (deleteTasks) await TaskModel.deleteMany({ userId: user._id, projectId: id });
  else await TaskModel.updateMany({ userId: user._id, projectId: id }, { $set: { projectId: null } });
  return ok({ ok: true });
});
