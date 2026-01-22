/**
 * Canvas Assignments Tool
 * Fetches all assignments from a specific class or all classes
 * Only callable via programmatic tool calling (code execution)
 */

import { tool } from "ai";
import { z } from "zod";
import {
  getAllCanvasCourses,
  getAssignment,
} from "@/app/classes/classes-actions";

export const getClassAssignmentsTool = tool({
  description:
    "Fetch assignments from Canvas LMS. If classId is provided, fetches from that class only. If classId is omitted, fetches from ALL user's classes in parallel and includes a '_classId' field in each assignment. Returns detailed assignment data including due dates, points, and submission status.",
  inputSchema: z.object({
    classId: z
      .string()
      .optional()
      .describe(
        "The Canvas class ID. If omitted, fetches from all classes in parallel.",
      ),
    filter: z
      .enum([
        "past",
        "overdue",
        "undated",
        "ungraded",
        "unsubmitted",
        "upcoming",
        "future",
      ])
      .optional()
      .describe(
        "Optional filter to narrow down assignments: past, overdue, undated, ungraded, unsubmitted, upcoming, or future",
      ),
  }),
  execute: async ({ classId, filter }) => {
    // If classId provided, fetch from that class only
    if (classId) {
      const assignments = await getAssignment({
        classId,
        filter,
      });

      if (assignments === "Unauthorized") {
        throw new Error("Unauthorized: User is not authenticated");
      }

      if (assignments === "Settings not configured") {
        throw new Error(
          "Canvas settings not configured. User needs to set up Canvas API credentials.",
        );
      }

      return assignments;
    }

    // If no classId, fetch from all classes
    const courses = await getAllCanvasCourses();

    if (courses === "Unauthorized") {
      throw new Error("Unauthorized: User is not authenticated");
    }

    if (courses === "Settings not configured") {
      throw new Error(
        "Canvas settings not configured. User needs to set up Canvas API credentials.",
      );
    }

    // Fetch assignments from all classes in parallel
    const assignmentPromises = courses.map(async (course) => {
      const assignments = await getAssignment({
        classId: course.id.toString(),
        filter,
      });

      // Handle error cases
      if (
        assignments === "Unauthorized" ||
        assignments === "Settings not configured"
      ) {
        return [];
      }

      // Add _classId and _className to each assignment
      return (assignments as Array<any>).map((assignment) => ({
        ...assignment,
        _classId: course.id.toString(),
        _className: course.name,
      }));
    });

    const allAssignments = await Promise.all(assignmentPromises);

    // Flatten the array of arrays
    return allAssignments.flat();
  },
  providerOptions: {
    anthropic: {
      allowedCallers: ["code_execution_20250825"],
    },
  },
});
