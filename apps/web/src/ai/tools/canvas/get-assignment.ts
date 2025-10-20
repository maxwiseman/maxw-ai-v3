import { LLMKeyToCanvasId } from "@/ai/utils/canvas-llm-helpers";
import {
  getAllCanvasCourses,
  getAssignment,
} from "@/app/classes/classes-actions";
import { tool } from "ai";
import z from "zod";

export const getAssignmentTool = tool({
  description: "Get one or many assignments for the current user",
  inputSchema: z.object({
    filter: z.enum([
      "past",
      "overdue",
      "undated",
      "ungraded",
      "unsubmitted",
      "upcoming",
      "future",
      "all",
    ]),
    classId: z.string().optional(),
    assignmentId: z.string().optional(),
    page: z.number().optional(),
  }),
  execute: getAssignmentsExec,
});

async function getAssignmentsExec({
  filter,
  classId,
  assignmentId,
  page,
}: {
  filter:
    | "past"
    | "overdue"
    | "undated"
    | "ungraded"
    | "unsubmitted"
    | "upcoming"
    | "future"
    | "all";
  classId?: string;
  assignmentId?: string;
  page?: number;
}) {
  const courses = await getAllCanvasCourses();
  if (typeof courses !== "object") throw courses;
  const convertedClassId =
    classId === undefined
      ? undefined
      : LLMKeyToCanvasId(
          classId,
          courses.map((course) => ({
            name: course.original_name ?? course.name,
            id: course.id,
            shortName: course.name,
          }))
        );
  const assignmentPromises = courses
    .filter((course) =>
      classId !== undefined
        ? convertedClassId?.toString() === course.id.toString()
        : true
    )
    .map(async (course) => {
      return {
        course,
        assignments: await getAssignment({
          filter: filter === "all" ? undefined : filter,
          classId: course.id.toString(),
        }),
      };
    });
  const assignmentData = await Promise.all(assignmentPromises);
  const returnData = assignmentData
    .map((courseAssignments) =>
      typeof courseAssignments === "string"
        ? "Error"
        : `## ${courseAssignments.course.name}\n${
            courseAssignments.assignments.length === 0
              ? "None"
              : courseAssignments.assignments
                  .map(
                    (assignment) =>
                      `Name: ${assignment.name}; Due: ${
                        assignment.due_at
                          ? new Date(assignment.due_at).toLocaleDateString()
                          : "No due date"
                      }; Submitted: ${assignment.has_submitted_submissions}`
                  )
                  .join("\n")
          }`
    )
    .join("\n---\n");
  console.log(returnData);
  return returnData;
}
