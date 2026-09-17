import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api-helpers";
import { ProjectModel, type ProjectDoc } from "@/lib/models/Project";
import { projectSchema } from "@/lib/validators";
import { serializeProject } from "@/lib/serialize";

export const GET = handler(async () => {
  const user = await requireUser();
  const projects = await ProjectModel.find({ userId: user._id }).sort({ order: 1, createdAt: 1 }).lean<ProjectDoc[]>();
  return ok({ projects: projects.map(serializeProject) });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = projectSchema.parse(await req.json());
  const count = await ProjectModel.countDocuments({ userId: user._id });
  const project = await ProjectModel.create({ ...input, order: count, userId: user._id });
  return ok({ project: serializeProject(project.toObject()) }, { status: 201 });
});
