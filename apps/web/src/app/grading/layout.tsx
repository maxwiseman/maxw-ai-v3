import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";

export default async function GradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) redirect("/login");

  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, authData.user.id),
  });

  if (userRecord?.settings?.role !== "teacher") redirect("/");

  return <>{children}</>;
}
