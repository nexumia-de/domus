// User ids: `u-` plus a lower-case UUID (docs/data-model.md#ids). Seed ids
// are slugs and never have this form, so a user entity cannot shadow a seed
// entity.

const USER_ID = /^u-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isUserId = (id: string): boolean => USER_ID.test(id);

export const newUserId = (): string => `u-${crypto.randomUUID()}`;
