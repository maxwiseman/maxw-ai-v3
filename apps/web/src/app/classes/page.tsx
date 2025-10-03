"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllCanvasCourses } from "./classes-actions";
import type { Course } from "@/lib/canvas-types";
import Link from "next/link";
import { useEffect } from "react";

export default function ClassesPage() {
  const queryClient = useQueryClient();
  const { data, isSuccess } = useQuery({
    queryFn: getAllCanvasCourses,
    queryKey: ["canvas-course"],
  });
  useEffect(() => {
    if (isSuccess && Array.isArray(data)) {
      data.forEach((course) => {
        queryClient.setQueryData(
          ["canvas-course", course.id.toString()],
          course
        );
      });
    }
  }, [isSuccess, data, queryClient]);
  console.log(data);

  return (
    <div>
      <div className="p-8 flex justify-between">
        <div>
          <h1 className="text-4xl font-medium font-serif">Your Classes</h1>
          <p className="text-muted-foreground">
            Get your work done, or have it done for you
          </p>
        </div>
      </div>
      {typeof data === "object" ? (
        <div className="grid grid-cols-3 px-8 pb-8 gap-4">
          {data.map((course) => (
            <ClassCard key={course.id} {...course} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ClassCard(courseData: Course) {
  return (
    <Link prefetch href={`/classes/${courseData.id}`}>
      <Button variant="outline" asChild>
        <Card className="p-0 flex flex-col gap-0 h-auto items-start cursor-pointer">
          <CardHeader className="p-4 pb-0 block w-full">
            <CardTitle className="text-lg font-normal line-clamp-1 overflow-ellipsis">
              {courseData.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="!pt-0 p-4 w-full">
            <div className="text-muted-foreground">Some kinda information</div>
          </CardContent>
        </Card>
      </Button>
    </Link>
  );
}
