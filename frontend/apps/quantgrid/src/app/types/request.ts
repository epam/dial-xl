export type ApiRequestFunction<T, K> = (params: T) => Promise<K | undefined>;
