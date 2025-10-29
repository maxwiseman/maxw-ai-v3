import { IconUserExclamation } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";

export function NotAuthenticated() {
  return (
    <div className="flex size-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <IconUserExclamation />
          </EmptyMedia>
          <EmptyTitle>Not authenticated</EmptyTitle>
          <EmptyDescription>Log in to access this page</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
