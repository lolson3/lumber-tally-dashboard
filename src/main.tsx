import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ApiError, NetworkError } from "./api/client";
import "./styles.css";
import { registerServiceWorker } from "./pwa/registerServiceWorker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        if (error instanceof DOMException && error.name === "AbortError") return false;
        if (error instanceof ApiError && error.status < 500) return false;
        return (error instanceof NetworkError || error instanceof ApiError) && failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 8_000),
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

registerServiceWorker();
