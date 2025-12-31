import { PageHeader, PageHeaderContent } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassLoading() {
  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-5 w-40" />
        </PageHeaderContent>
      </PageHeader>
      <div className="space-y-4 px-8 pb-8">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
    </div>
  );
}
