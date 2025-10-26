"use client";

import { Provider as ChatProvider } from "ai-sdk-tools";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  QueryClient,
  QueryClientProvider as RQQueryClientProvider,
} from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SidebarExtensionProvider } from "./sidebar";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Number.POSITIVE_INFINITY,
      staleTime: 300000,
    },
  },
});
persistQueryClient({
  queryClient,
  persister: createAsyncStoragePersister({
    storage: typeof window !== "undefined" ? window.localStorage : null,
  }),
});

export function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RQQueryClientProvider client={queryClient}>
      {children}
    </RQQueryClientProvider>
  );

  // const persister = useMemo(() => {
  //   if (typeof window === "undefined") return undefined;
  //   return createAsyncStoragePersister({ storage: window.localStorage });
  // }, []);

  // if (typeof window === "undefined") {
  //   return (
  //     <RQQueryClientProvider client={queryClient}>
  //       {children}
  //     </RQQueryClientProvider>
  //   );
  // }

  // if (!persister) {
  //   return (
  //     <RQQueryClientProvider client={queryClient}>
  //       {children}
  //     </RQQueryClientProvider>
  //   );
  // }

  // return (
  //   <PersistQueryClientProvider
  //     persistOptions={{ persister: persister }}
  //     client={queryClient}
  //   >
  //     {children}
  //   </PersistQueryClientProvider>
  // );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* <SidebarProvider
        style={
          {
            "--sidebar-width": "350px",
            } as React.CSSProperties
            }
            className="size-full"
            > */}
      <QueryClientProvider>
          <ChatProvider>
        <NuqsAdapter>
          <SidebarExtensionProvider>{children}</SidebarExtensionProvider>
        </NuqsAdapter>
          </ChatProvider>
      </QueryClientProvider>
      <Toaster richColors />
      {/* </SidebarProvider> */}
    </ThemeProvider>
  );
}
