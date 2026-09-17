/**
 * Execute the small, trusted set of task types supported by this worker.
 *
 * This deliberately accepts a task record rather than user-provided code so
 * new task types can be added as explicit handlers later.
 */
export async function executeTask(task) {
  switch (task.type) {
    case 'demo':
      return {
        message: 'Demo task completed',
        payload: task.payload,
      };
    case 'slow-demo':
      await new Promise((resolve) => setTimeout(resolve, 7_000));
      return { message: 'Slow demo task completed', payload: task.payload };
    case 'fail-demo':
      throw new Error('Intentional fail-demo error');
    default:
      throw new Error(`Unsupported task type: ${task.type}`);
  }
}
