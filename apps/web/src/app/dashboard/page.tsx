import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "./dashboard";
import { headers } from "next/headers";

export default async function DashboardPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {session.user.name}</p>
			<Dashboard session={session} />
		</div>
	);
}
