export class UserFacingError extends Error {}

export function getUserErrorMessage(error: unknown, fallback: string) {
  return error instanceof UserFacingError ? error.message : fallback;
}
