import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getDisplayErrorMessage } from '@/lib/api-error';

function getErrorMessage(error: unknown): string {
  return getDisplayErrorMessage(error);
}

function shouldSuppressToast(meta: Record<string, unknown> | undefined): boolean {
  return meta?.suppressErrorToast === true;
}

function shouldToastQueryError(meta: Record<string, unknown> | undefined): boolean {
  return meta?.toastOnError === true && !shouldSuppressToast(meta);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (!shouldToastQueryError(query.meta)) {
        return;
      }

      toast.error(getErrorMessage(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (shouldSuppressToast(mutation.meta)) {
        return;
      }

      toast.error(getErrorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
