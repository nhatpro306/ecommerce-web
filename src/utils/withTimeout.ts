export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  const start = Date.now();
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      reject(
        new Error(
          `${message} (Supabase query timeout after ${elapsedSec}s)`,
        ),
      );
    }, timeoutMs);

    Promise.resolve(promise)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

export async function withServerTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  const start = Date.now();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
          reject(
            new Error(
              `${message} (Supabase query timeout after ${elapsedSec}s)`,
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
