"use client";

import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { use } from "react";
import { getAssignment } from "@/app/classes/classes-actions";
import { CanvasHTML } from "@/components/canvas-html";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderContent,
	PageHeaderDescription,
	PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function AssignmentPage({
	params: paramsPromise,
}: {
	params: Promise<{ classId: string; assignmentId: string }>;
}) {
	const params = use(paramsPromise);
	const { data } = useQuery({
		queryFn: () => getAssignment(params),
		queryKey: [
			"canvas-course",
			params.classId,
			"assignments",
			params.assignmentId,
		],
	});
	if (typeof data === "string") notFound();

	return (
		<div>
			<PageHeader className="flex-wrap">
				<PageHeaderContent>
					<PageHeaderTitle className="max-w-lg">{data?.name}</PageHeaderTitle>
					{data?.due_at && (
						<PageHeaderDescription className="text-lg">
							{new Date(data?.due_at).toLocaleString("en-us", {
								timeStyle: "short",
								dateStyle: "medium",
							})}
						</PageHeaderDescription>
					)}
				</PageHeaderContent>
				<PageHeaderActions>
					<Button variant="outline">
						<IconPlus className="text-muted-foreground" />
						Add todo
					</Button>
					<Button>
						{/* <IconPlus className="text-muted-foreground" /> */}
						Submit
					</Button>
				</PageHeaderActions>
			</PageHeader>
			<CanvasHTML className="px-8 pb-8">{data?.description}</CanvasHTML>
		</div>
	);
}
