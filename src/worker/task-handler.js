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
    default:
      throw new Error(`Unsupported task type: ${task.type}`);
  }
}
