"use client";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

import {
  QueryClient,
  QueryClientProvider as RQQueryClientProvider,
} from "@tanstack/react-query";
import {
  persistQueryClient,
  PersistQueryClientProvider,
} from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useMemo } from "react";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
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
      <QueryClientProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
