"use client";

import { use } from "react";
import { ClassSidebar } from "./class-sidebar";

export default function Layout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ classId: string }>;
}) {
	const awaitedParams = use(params);

	return (
		<div>
			<ClassSidebar classId={awaitedParams.classId} />
			{children}
		</div>
	);
}
