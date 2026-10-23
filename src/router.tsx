import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Retry brief network drops (e.g. dev server restarting) instead of failing the page.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 3, retryDelay: (n) => Math.min(500 * 2 ** n, 4000) } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
