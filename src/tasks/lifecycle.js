export function retryDelaySeconds(attempts) {
  // 5s, 10s, 20s ... keeps retries visible during a demo.
  return 5 * (2 ** Math.max(0, attempts - 1));
}

export function retryAt(attempts) {
  return new Date(Date.now() + retryDelaySeconds(attempts) * 1_000);
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
