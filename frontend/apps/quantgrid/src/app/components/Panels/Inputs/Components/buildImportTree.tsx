import { DataNode } from 'antd/es/tree';

import Icon from '@ant-design/icons';
import {
  ColumnsIcon,
  DatabaseIcon,
  ImportCatalog,
  ImportDataset,
  ImportSource,
  TableIcon,
} from '@frontend/common';

import { externalSourceIconMapping } from '../../../../utils';
import { draggedImageIdPrefix, importTreeKey, InputChildData } from '../hooks';

export interface BuildImportTreeParams {
  importSources: Record<string, ImportSource>;
  importCatalogs: Record<string, ImportCatalog>;
  importDatasets: Record<string, ImportDataset>;
}

export interface BuildImportTreeResult {
  nodes: DataNode[];
  childData: InputChildData;
}

export function buildImportTree({
  importSources,
  importCatalogs,
  importDatasets,
}: BuildImportTreeParams): BuildImportTreeResult {
  const nodes: DataNode[] = [];
  const childData: InputChildData = {};

  Object.entries(importSources).forEach(([sourceKey, source]) => {
    const sourceNode: DataNode = {
      key: `${importTreeKey.source}${sourceKey}`,
      title: source.name,
      isLeaf: false,
      children: undefined,
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => {
            const ResultedIcon = externalSourceIconMapping[source.definition];

            return ResultedIcon ? <ResultedIcon /> : <DatabaseIcon />;
          }}
        />
      ),
    };

    // Check if catalogs are loaded for this source
    const catalog = importCatalogs[sourceKey];
    if (catalog?.datasets) {
      const catalogChildren: DataNode[] = [];

      Object.entries(catalog.datasets).forEach(([datasetKey, _]) => {
        const key = `${importTreeKey.catalog}${sourceKey}:${datasetKey}:${source.name}`;
        const datasetNode: DataNode = {
          key,
          title: datasetKey,
          isLeaf: false,
          children: undefined,
          icon: (
            <Icon
              className="text-text-secondary w-[18px]"
              component={() => <TableIcon />}
              id={`${draggedImageIdPrefix}${key}`}
            />
          ),
        };

        // Check if columns are loaded for this dataset
        const fullDataset = importDatasets[`${sourceKey}:${datasetKey}`];
        if (fullDataset?.schema?.columns) {
          datasetNode.children = Object.entries(fullDataset.schema.columns).map(
            ([columnKey, item]) => ({
              key: `${importTreeKey.column}${sourceKey}:${datasetKey}:${columnKey}`,
              title: item.column,
              isLeaf: true,
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <ColumnsIcon />}
                />
              ),
            }),
          );
        }

        catalogChildren.push(datasetNode);
      });

      sourceNode.children = catalogChildren;
    }

    nodes.push(sourceNode);
  });

  return { nodes, childData };
}
