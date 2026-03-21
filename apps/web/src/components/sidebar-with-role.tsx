import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import Sidebar from "./sidebar";

export default async function SidebarWithRole() {
  const authData = await auth.api.getSession({ headers: await headers() });

  let isTeacher = false;
  if (authData) {
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, authData.user.id),
    });
    isTeacher = userRecord?.settings?.role === "teacher";
  }

  return <Sidebar isTeacher={isTeacher} />;
}
