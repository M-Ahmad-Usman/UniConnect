export interface CoreDtoInput {
  id: number;
  publicId: string;
}

export type CorePublicDto<T extends CoreDtoInput> = Omit<T, "id">;

function omitInternalId<T extends CoreDtoInput>(record: T): CorePublicDto<T> {
  const { id: _internalId, ...publicRecord } = record;
  return publicRecord;
}

/**
 * Shallow public DTO mappers for core entities.
 *
 * Compose these explicitly for nested core records. Catalog/admin entities such
 * as departments, programs, courses, disciplines, degree levels, designations,
 * membership requests, curriculum entries, and notifications intentionally keep
 * their numeric IDs during this refactor.
 */
export function mapUserPublicDto<T extends CoreDtoInput>(user: T): CorePublicDto<T> {
  return omitInternalId(user);
}

export function mapClassPublicDto<T extends CoreDtoInput>(classRecord: T): CorePublicDto<T> {
  return omitInternalId(classRecord);
}

export function mapSocietyPublicDto<T extends CoreDtoInput>(society: T): CorePublicDto<T> {
  return omitInternalId(society);
}

export function mapServerPublicDto<T extends CoreDtoInput>(server: T): CorePublicDto<T> {
  return omitInternalId(server);
}

export function mapChannelPublicDto<T extends CoreDtoInput>(channel: T): CorePublicDto<T> {
  return omitInternalId(channel);
}

export function mapPostPublicDto<T extends CoreDtoInput>(post: T): CorePublicDto<T> {
  return omitInternalId(post);
}

export function mapPublicDtoArray<T extends CoreDtoInput>(
  records: readonly T[],
  mapper: (record: T) => CorePublicDto<T>,
): CorePublicDto<T>[] {
  return records.map((record) => mapper(record));
}

