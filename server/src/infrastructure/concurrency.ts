export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }

  const output = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index]!, index);
    }
  });
  await Promise.all(workers);
  return output;
}
