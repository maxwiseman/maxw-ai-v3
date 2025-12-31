import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassesLoading() {
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
      <div className="grid grid-cols-1 gap-4 px-8 pb-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-auto flex-col items-start gap-0 rounded-md border bg-background p-0"
          >
            <div className="block w-full p-4 pb-0">
              <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="w-full p-4 pt-2">
              <Skeleton className="h-5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
