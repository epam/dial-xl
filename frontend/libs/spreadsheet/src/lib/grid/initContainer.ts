import { Container } from 'inversify';

import {
  COLUMN_SERVICE,
  COLUMN_STATE_SERVICE,
  CONFIG,
  DATA_ROW,
  DATA_ROW_FACTORY,
  DATA_SERVICE,
  DATA_VIEW,
  EVENTS_SERVICE,
  HEADER,
  HEADER_CELL,
  HEADER_CELL_FACTORY,
  ICON_FACTORY,
  ICON_SERVICE,
  IconFactory,
  iconFactory,
  IconService,
  ROW_SERVICE,
  SERVICE_OPTIONS,
} from '@deltix/grid-it';
import {
  GridItOptionsInternal,
  IColumnService,
  IColumnStateService,
  IHeader,
  Service,
  ServiceType,
} from '@deltix/grid-it-core';

import { CellEditorService } from './cellEditor';
import { ColumnService } from './column';
import { ColumnStateService } from './columnState';
import { DataRow, DataService, DataView, IDataService } from './data';
import { EventsService, IEventsService } from './events';
import { Header, HeaderCell } from './header';
import { IRowService, RowService } from './row';
import { RowNumberService } from './rowNumber';
import { SelectionService } from './selection';
import {
  CELL_EDITOR_SERVICE,
  COMPONENT_MAPPING,
  COMPONENT_TYPES,
  ROW_NUMBER_SERVICE,
  SELECTION_SERVICE,
} from './types';

export const initContainer = <T>(options: GridItOptionsInternal<T>) => {
  let container = new Container();

  container.bind<GridItOptionsInternal<T>>(CONFIG).toConstantValue(options);

  container.bind<IDataService>(DATA_SERVICE).to(DataService).inSingletonScope();

  container
    .bind<IEventsService>(EVENTS_SERVICE)
    .to(EventsService)
    .inSingletonScope();

  container
    .bind<IColumnStateService>(COLUMN_STATE_SERVICE)
    .to(ColumnStateService)
    .inSingletonScope();

  container
    .bind<IColumnService>(COLUMN_SERVICE)
    .to(ColumnService)
    .inSingletonScope();

  container.bind<IconService>(ICON_SERVICE).to(IconService).inSingletonScope();
  container.bind<IconFactory>(ICON_FACTORY).toFactory(iconFactory);

  container.bind<IRowService>(ROW_SERVICE).to(RowService).inSingletonScope();

  container.bind<IHeader>(HEADER).to(Header).inSingletonScope();
  container.bind<HeaderCell<T>>(HEADER_CELL).to(HeaderCell);
  container
    .bind<() => HeaderCell<T>>(HEADER_CELL_FACTORY)
    .toAutoFactory(HEADER_CELL);

  container.bind<DataRow>(DATA_ROW).to(DataRow);
  container.bind<() => DataRow>(DATA_ROW_FACTORY).toAutoFactory(DATA_ROW);

  container.bind<DataView>(DATA_VIEW).to(DataView).inSingletonScope();

  container
    .bind<SelectionService>(SELECTION_SERVICE)
    .to(SelectionService)
    .inSingletonScope();

  container
    .bind<RowNumberService>(ROW_NUMBER_SERVICE)
    .to(RowNumberService)
    .inSingletonScope();

  container
    .bind<CellEditorService>(CELL_EDITOR_SERVICE)
    .to(CellEditorService)
    .inSingletonScope();

  container.bind(Container).toConstantValue(container);

  if (options?.plugins) {
    const serviceOptions: Record<symbol, unknown> = {};

    for (const { services, components, autoFactoryMap } of options.plugins) {
      let hasServices = false;
      const temp = new Container();
      if (services) {
        const s = Object.getOwnPropertySymbols(services);
        for (const key of s) {
          bind(temp, key, services[key] as Service<never>, container);
          fillOptions(serviceOptions, key, services[key]);
          hasServices = true;
        }
      }

      const comp = Object.entries(components || {});

      for (const [compType, srv] of comp) {
        if (!COMPONENT_TYPES.has(compType)) {
          continue;
        }
        const type: symbol | undefined =
          COMPONENT_MAPPING[compType as keyof typeof COMPONENT_MAPPING];

        for (const s of srv) {
          bind(temp, type, s as Service<never>, container);
          fillOptions(serviceOptions, type, s);
          hasServices = true;
        }
      }

      if (hasServices) {
        container = Container.merge(container, temp) as Container;
      }

      if (autoFactoryMap) {
        for (const factoryKey of Object.getOwnPropertySymbols(autoFactoryMap)) {
          container.bind(factoryKey).toAutoFactory(autoFactoryMap[factoryKey]);
        }
      }
    }

    container.bind(SERVICE_OPTIONS).toConstantValue(serviceOptions);
  }

  return container;
};

function bind(
  container: Container,
  key: symbol,
  service: Service<never>,
  parent: Container
) {
  if (service && typeof service === 'object') {
    const bind = container.bind(key);
    if (service.factory) {
      bind.toFactory(service.service);
    } else {
      const binding = bind.to(service.service);
      if (service.single) {
        binding.inSingletonScope();
      }
    }
    if (service.rebind && parent.isBound(key)) {
      parent.unbind(key);
    }
  }
}

function fillOptions(
  target: Record<symbol, unknown>,
  key: symbol,
  service: Service<ServiceType, any[]>
) {
  if (service.options) {
    target[key] = service.options;
  }
}
