import { getRedisClient } from './redis.js';

export const queueKeys = {
  ready: 'synora:tasks:ready',
};

export async function enqueueTaskId(taskId) {
  const redis = await getRedisClient();
  await redis.lPush(queueKeys.ready, taskId);
}

export async function dequeueTaskId({ timeoutSeconds = 0 } = {}) {
  const redis = await getRedisClient();
  const result = await redis.brPop(queueKeys.ready, timeoutSeconds);
  return result?.element ?? null;
}
