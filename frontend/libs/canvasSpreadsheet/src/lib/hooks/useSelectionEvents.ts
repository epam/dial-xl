import { useContext, useEffect } from 'react';

import { GridStateContext } from '../context';
import { EventTypeSelectAll, GridEvent } from '../types';
import { filterByTypeAndCast } from '../utils';
import { useSelection } from './useSelection';

export function useSelectionEvents() {
  const { events$ } = useContext(GridStateContext);

  const { selectTable, selectTableByName } = useSelection();

  useEffect(() => {
    if (!events$) return;

    const selectAllSubscription = events$
      .pipe(filterByTypeAndCast<EventTypeSelectAll>(GridEvent.selectAll))
      .subscribe(({ tableName, selectFromCurrentCell }) => {
        if (tableName) {
          selectTableByName(tableName);

          return;
        }

        if (!selectFromCurrentCell) return;

        selectTable();
      });

    return () => {
      selectAllSubscription.unsubscribe();
    };
  }, [events$, selectTable, selectTableByName]);
}
