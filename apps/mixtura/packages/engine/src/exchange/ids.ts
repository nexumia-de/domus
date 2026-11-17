// User ids: `u-` plus a lower-case UUID (docs/data-model.md#ids). Seed ids
// are slugs and never have this form, so a user entity cannot shadow a seed
// entity. Making a new id needs randomness and stays in the host.

const USER_ID = /^u-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** True when the id has the form of a user id (`u-` and a lower-case UUID). */
export const isUserId = (id: string): boolean => USER_ID.test(id);
