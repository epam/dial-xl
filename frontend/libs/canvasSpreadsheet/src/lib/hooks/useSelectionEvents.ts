import { useContext, useEffect } from 'react';

import { EventTypeSelectAll, GridEvent } from '../components/GridApiWrapper';
import { GridStateContext } from '../context';
import { filterByTypeAndCast } from '../utils';
import { useSelection } from './useSelection';

export function useSelectionEvents() {
  const { gridApi } = useContext(GridStateContext);

  const { selectTable, selectTableByName } = useSelection();

  useEffect(() => {
    if (!gridApi.events$) return;

    const selectAllSubscription = gridApi.events$
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
  }, [gridApi, selectTable, selectTableByName]);
}
