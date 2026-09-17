import { closeRedisConnection } from './redis.js';
import { dequeueTaskId, enqueueTaskId } from './task-queue.js';

const [command, taskId] = process.argv.slice(2);

if (command === 'enqueue' && taskId) {
  await enqueueTaskId(taskId);
  console.log(`Enqueued task ${taskId}`);
} else if (command === 'dequeue') {
  const dequeuedTaskId = await dequeueTaskId({ timeoutSeconds: 1 });
  console.log(dequeuedTaskId ?? 'No task available');
} else {
  console.error('Usage: npm run queue:smoke -- enqueue <task-id> | dequeue');
  process.exitCode = 1;
}

await closeRedisConnection();
