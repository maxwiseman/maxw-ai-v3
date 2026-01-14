"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAllCanvasCourses,
  getAssignment,
  getCanvasCourse,
  getClassModules,
  getDiscussion,
  getFrontPage,
  getPage,
} from "./classes-actions";

// Query key factory for consistent cache keys
export const classesKeys = {
  all: ["classes"] as const,
  lists: () => [...classesKeys.all, "list"] as const,
  list: () => [...classesKeys.lists()] as const,
  details: () => [...classesKeys.all, "detail"] as const,
  detail: (classId: string) => [...classesKeys.details(), classId] as const,
  frontPage: (classId: string) =>
    [...classesKeys.detail(classId), "frontPage"] as const,
  modules: (classId: string) =>
    [...classesKeys.detail(classId), "modules"] as const,
  assignments: (classId: string) =>
    [...classesKeys.detail(classId), "assignments"] as const,
  assignment: (classId: string, assignmentId: string) =>
    [...classesKeys.assignments(classId), assignmentId] as const,
  pages: (classId: string) =>
    [...classesKeys.detail(classId), "pages"] as const,
  page: (classId: string, pageId: string) =>
    [...classesKeys.pages(classId), pageId] as const,
  discussions: (classId: string) =>
    [...classesKeys.detail(classId), "discussions"] as const,
  discussion: (classId: string, discussionId: string) =>
    [...classesKeys.discussions(classId), discussionId] as const,
};

// Hook to fetch all canvas courses
export function useCanvasCourses() {
  return useQuery({
    queryKey: classesKeys.list(),
    queryFn: getAllCanvasCourses,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch a single canvas course
export function useCanvasCourse(classId: string) {
  return useQuery({
    queryKey: classesKeys.detail(classId),
    queryFn: () => getCanvasCourse({ classId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!classId,
  });
}

// Hook to fetch the front page of a course
export function useFrontPage(classId: string) {
  return useQuery({
    queryKey: classesKeys.frontPage(classId),
    queryFn: () => getFrontPage({ classId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!classId,
  });
}

// Hook to fetch class and front page together
export function useClassWithFrontPage(classId: string) {
  const classQuery = useCanvasCourse(classId);
  const frontPageQuery = useFrontPage(classId);

  return {
    classData: classQuery.data,
    frontPageData: frontPageQuery.data,
    isLoading: classQuery.isLoading || frontPageQuery.isLoading,
    isPending: classQuery.isPending || frontPageQuery.isPending,
    isError: classQuery.isError || frontPageQuery.isError,
    error: classQuery.error || frontPageQuery.error,
  };
}

// Hook to fetch class modules
export function useClassModules(classId: string) {
  return useQuery({
    queryKey: classesKeys.modules(classId),
    queryFn: () => getClassModules({ classId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!classId,
  });
}

// Hook to fetch all assignments for a class
export function useClassAssignments(
  classId: string,
  filter?:
    | "past"
    | "overdue"
    | "undated"
    | "ungraded"
    | "unsubmitted"
    | "upcoming"
    | "future",
) {
  return useQuery({
    queryKey: [...classesKeys.assignments(classId), filter],
    queryFn: () => getAssignment({ classId, filter }),
    staleTime: 5 * 60 * 1000,
    enabled: !!classId,
  });
}

// Hook to fetch a single assignment
export function useAssignment(classId: string, assignmentId: string) {
  return useQuery({
    queryKey: classesKeys.assignment(classId, assignmentId),
    queryFn: () => getAssignment({ classId, assignmentId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!classId && !!assignmentId,
  });
}

// Hook to fetch all pages for a class
export function useClassPages(
  classId: string,
  filter?: "published" | "unpublished" | "all",
) {
  return useQuery({
    queryKey: [...classesKeys.pages(classId), filter],
    queryFn: () => getPage({ classId, filter }),
    staleTime: 5 * 60 * 1000,
    enabled: !!classId,
  });
}

// Hook to fetch a single page
export function usePage(classId: string, pageId: string) {
  return useQuery({
    queryKey: classesKeys.page(classId, pageId),
    queryFn: () => getPage({ classId, pageId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!classId && !!pageId,
  });
}

// Hook to fetch a discussion
export function useDiscussion(classId: string, discussionId: string) {
  return useQuery({
    queryKey: classesKeys.discussion(classId, discussionId),
    queryFn: () => getDiscussion({ classId, discussionId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!classId && !!discussionId,
  });
}
