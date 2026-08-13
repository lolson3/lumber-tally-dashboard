import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { tallyApi } from "../api/client";
import type { FileOut } from "../api/types";

const PREFETCH_START_DELAY_MS = 1_000;
const PREFETCH_BETWEEN_REPORTS_MS = 150;

export function reportDetailQueryOptions(fileId: number) {
  return queryOptions({
    queryKey: ["file-detail", fileId],
    queryFn: ({ signal }) => tallyApi.file(fileId, signal),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function newestReportsFirst(files: FileOut[]) {
  return [...files].sort((left, right) => {
    const leftDate = left.report_datetime || left.filename_date;
    const rightDate = right.report_datetime || right.filename_date;
    return rightDate.localeCompare(leftDate) || right.file_id - left.file_id;
  });
}

export function useReportDetailPrefetch(files: FileOut[], enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || files.length === 0) return;

    const orderedFiles = newestReportsFirst(files);
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let index = 0;

    const prefetchNext = async () => {
      if (cancelled || index >= orderedFiles.length) return;
      const file = orderedFiles[index++];
      try {
        await queryClient.prefetchQuery(reportDetailQueryOptions(file.file_id));
      } finally {
        if (!cancelled && index < orderedFiles.length) {
          timeoutId = setTimeout(() => { void prefetchNext(); }, PREFETCH_BETWEEN_REPORTS_MS);
        }
      }
    };

    timeoutId = setTimeout(() => { void prefetchNext(); }, PREFETCH_START_DELAY_MS);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [enabled, files, queryClient]);
}
