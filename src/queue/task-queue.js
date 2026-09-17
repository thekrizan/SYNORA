import { getRedisClient } from './redis.js';

export const queueKeys = {
  ready: 'synora:tasks:ready',
  dlq: 'synora:tasks:dlq',
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

export async function enqueueDlqTaskId(taskId) {
  const redis = await getRedisClient();
  await redis.lPush(queueKeys.dlq, taskId);
}

export async function removeDlqTaskId(taskId) {
  const redis = await getRedisClient();
  await redis.lRem(queueKeys.dlq, 0, taskId);
}
