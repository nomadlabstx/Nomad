/** Connectivity probe used by network-status. 204 with an empty body. */
export const CONNECTIVITY_PROBE_URL = 'https://clients3.google.com/generate_204';

/** HTTP statuses that mean "we reached the internet." */
export function isOnlineHttpStatus(status: number): boolean {
  return status === 204 || (status >= 200 && status < 400);
}
