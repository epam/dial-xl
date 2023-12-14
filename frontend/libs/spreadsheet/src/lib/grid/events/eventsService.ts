import { inject, injectable, postConstruct } from 'inversify';
import { merge, Observable, Subject } from 'rxjs';
import { filter, map, skip, takeUntil } from 'rxjs/operators';

import { COLUMN_STATE_SERVICE, Destroyable } from '@deltix/grid-it';
import type { IColumnStateService } from '@deltix/grid-it-core';

import { EventType, GridEvent, IEventsService } from './types';

@injectable()
export class EventsService extends Destroyable implements IEventsService {
  protected events = new Subject<EventType>();

  events$!: Observable<EventType>;

  constructor(
    @inject(COLUMN_STATE_SERVICE)
    protected columnStateService: IColumnStateService
  ) {
    super();
  }

  emit(event: EventType) {
    this.events.next(event);
  }

  destroy() {
    this.events.complete();
    super.destroy();
  }

  @postConstruct()
  protected subscribe() {
    this.events$ = merge(
      this.columnStateService.state$.pipe(
        filter((state) => !!state),
        skip(1),
        map(
          (state) =>
            ({ type: GridEvent.columnState, event: state } as EventType)
        )
      ),
      this.events
    ).pipe(takeUntil(this.destroy$));
  }
}
