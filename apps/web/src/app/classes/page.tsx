"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import {
	PageHeader,
	PageHeaderContent,
	PageHeaderDescription,
	PageHeaderTitle,
} from "@/components/page-header";
import { queryClient } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Course } from "@/lib/canvas-types";
import { toTitleCase } from "@/lib/utils";
import { getAllCanvasCourses, getFrontPage } from "./classes-actions";

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
					course,
				);
			});
		}
	}, [isSuccess, data, queryClient]);
	console.log(data);

	return (
		<div>
			<PageHeader>
				<PageHeaderContent>
					<PageHeaderTitle>Your Classes</PageHeaderTitle>
					<PageHeaderDescription>
						Get your work done, or have it done for you
					</PageHeaderDescription>
				</PageHeaderContent>
			</PageHeader>
			{typeof data === "object" ? (
				<div className="grid grid-cols-3 gap-4 px-8 pb-8">
					{data.map((course) => (
						<ClassCard key={course.id} {...course} />
					))}
				</div>
			) : (
				<div className="grid size-full max-h-96 place-items-center text-muted-foreground">
					Loading...
				</div>
			)}
		</div>
	);
}

function ClassCard(courseData: Course) {
	const teacher = courseData.teachers?.[0]?.display_name;
	return (
		<Link
			onMouseEnter={() => {
				if (
					!queryClient.getQueryData([
						"canvas-course",
						courseData.id,
						"frontpage",
					])
				) {
					getFrontPage({ classId: courseData.id.toString() }).then((data) => {
						console.log("Cached frontpage", courseData.name);
						queryClient.setQueryData(
							["canvas-course", courseData.id.toString(), "frontpage"],
							data,
						);
					});
				}
			}}
			prefetch
			href={`/classes/${courseData.id}`}
		>
			<Button variant="outline" asChild>
				<Card className="flex h-auto cursor-pointer flex-col items-start gap-0 p-0">
					<CardHeader className="block w-full p-4 pb-0">
						<CardTitle className="line-clamp-1 overflow-ellipsis font-normal text-lg">
							{courseData.name}
						</CardTitle>
					</CardHeader>
					<CardContent className="!pt-0 w-full p-4">
						<div className="text-muted-foreground">
							{teacher ? toTitleCase(teacher) : "No teachers"}
						</div>
					</CardContent>
				</Card>
			</Button>
		</Link>
	);
}
