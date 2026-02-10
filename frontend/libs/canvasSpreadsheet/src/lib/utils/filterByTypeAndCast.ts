import { Observable } from 'rxjs';

export function filterByTypeAndCast<T extends { type: string }>(
  eventType: string
) {
  return function (source: Observable<{ type: string }>): Observable<T> {
    return new Observable((subscriber) => {
      source.subscribe({
        next(value) {
          if (value.type === eventType) {
            subscriber.next(value as T);
          }
        },
        complete() {
          subscriber.complete();
        },
      });
    });
  };
}
