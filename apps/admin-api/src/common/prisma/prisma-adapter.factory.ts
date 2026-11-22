import { PrismaPg } from '@prisma/adapter-pg';
import type { Pool } from 'pg';

/**
 * pg forbids issuing a query to a client that is already executing one
 * (deprecated in pg 8.20+, removed in pg 9). Prisma's query engine
 * dispatches multiple queries concurrently onto the single pinned client of
 * a transaction (batch `$transaction([...])`, writes with multiple
 * `include` relations), which triggers that deprecated pg behavior today and
 * will break on pg 9. Upstream fix: prisma/orm#29407 (still open as of
 * adapter-pg 7.10.0).
 *
 * This wrapper serializes `queryRaw`/`executeRaw` per transaction so the
 * pinned client never receives a query while one is still in flight. It
 * deliberately does NOT touch the top-level adapter: non-transactional
 * queries go through the pool and keep their concurrency.
 */
type AnyFunction = (...args: unknown[]) => unknown;
type AsyncFunction<R> = (...args: unknown[]) => Promise<R>;

function serializeTransactionQueryable<T extends object>(target: T): T {
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = (fn: () => Promise<unknown>): Promise<unknown> => {
    const result = queue.then(fn);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return new Proxy(target, {
    get(tx, prop, receiver) {
      const value: unknown = Reflect.get(tx, prop, receiver);

      if (prop === 'queryRaw' || prop === 'executeRaw') {
        const query = value as AsyncFunction<unknown>;
        return (...args: unknown[]) =>
          enqueue(() => Reflect.apply(query, tx, args));
      }

      if (typeof value === 'function') {
        return (value as AnyFunction).bind(tx) as AnyFunction;
      }

      return value;
    },
  });
}

export function createPrismaPgAdapter(pool: Pool): PrismaPg {
  // `new PrismaPg(pool)` is an adapter factory: Prisma calls `connect()` on
  // it and uses the returned adapter, so `startTransaction` must be wrapped
  // there, not on the factory.
  return new Proxy(new PrismaPg(pool), {
    get(factory, prop, receiver) {
      const value: unknown = Reflect.get(factory, prop, receiver);

      if (prop === 'connect') {
        const connect = value as AsyncFunction<object>;
        return async (...args: unknown[]) => {
          const adapter = await Reflect.apply(connect, factory, args);
          return new Proxy(adapter, {
            get(inner, innerProp, innerReceiver) {
              const innerValue: unknown = Reflect.get(
                inner,
                innerProp,
                innerReceiver,
              );

              if (innerProp === 'startTransaction') {
                const startTransaction = innerValue as AsyncFunction<object>;
                return async (...txArgs: unknown[]) =>
                  serializeTransactionQueryable(
                    await Reflect.apply(startTransaction, inner, txArgs),
                  );
              }

              if (typeof innerValue === 'function') {
                return (innerValue as AnyFunction).bind(inner) as AnyFunction;
              }

              return innerValue;
            },
          });
        };
      }

      if (typeof value === 'function') {
        return (value as AnyFunction).bind(factory) as AnyFunction;
      }

      return value;
    },
  });
}
