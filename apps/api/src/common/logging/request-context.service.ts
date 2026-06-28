import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { RequestContextData } from './logging.types';

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run<T>(context: RequestContextData, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): RequestContextData {
    return this.storage.getStore() ?? {};
  }

  getRequestId(): string | undefined {
    return this.get().requestId;
  }

  set(partial: Partial<RequestContextData>): void {
    const store = this.storage.getStore();
    if (store) {
      Object.assign(store, partial);
    }
  }
}
