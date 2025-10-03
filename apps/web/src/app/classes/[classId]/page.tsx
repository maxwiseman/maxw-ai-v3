"use client";

import { useQuery } from "@tanstack/react-query";
import { use, useEffect } from "react";
import { getCanvasCourse } from "../classes-actions";

export default function ClassPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string }>;
}) {
  const params = use(paramsPromise);
  const {
    data: classData,
    isStale,
    isPending,
  } = useQuery({
    queryFn: () => getCanvasCourse({ courseId: params.classId }),
    queryKey: ["canvas-course", params.classId],
  });
  useEffect(() => {
    console.log(
      `hasData: ${
        classData !== undefined
      }, isStale: ${isStale}, isPending: ${isPending}`
    );
  }, [classData, isPending, isStale]);

  return (
    <div>
      <div suppressHydrationWarning>
        isPrerendered: {String(typeof window === "undefined")}
      </div>
      <div>isPending: {String(isPending)}</div>
      <div>isStale: {String(isStale)}</div>
      <div>{JSON.stringify(classData)}</div>
    </div>
  );
}
