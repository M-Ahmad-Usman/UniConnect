export const IMPACT_PREVIEW_LIMIT = 10;

export interface ImpactGroup<TPreview> {
  count: number;
  preview: TPreview[];
  hasMore: boolean;
}

export function buildImpactGroup<TPreview>(
  count: number,
  preview: TPreview[],
): ImpactGroup<TPreview> {
  return {
    count,
    preview,
    hasMore: count > preview.length,
  };
}
