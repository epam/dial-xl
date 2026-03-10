import { DataNode } from 'antd/es/tree';
import { useContext, useEffect, useState } from 'react';

import {
  MetadataNodeType,
  xlsFileExtension,
  xlsxFileExtension,
} from '@frontend/common';

import { InputsContext } from '../../../../context';
import { buildCSVTree, buildExcelTree, buildImportTree } from '../Components';
import { InputChildData } from './contextMenuTypes';

export interface UseInputsTreeResult {
  inputTree: DataNode[];
  childData: InputChildData;
}

export function useInputsTree(): UseInputsTreeResult {
  const {
    inputList,
    inputs,
    importSources,
    importCatalogs,
    importDatasets,
    excelCatalogs,
    excelSheets,
    excelTables,
  } = useContext(InputsContext);

  const [inputTree, setInputTree] = useState<DataNode[]>([]);
  const [childData, setChildData] = useState<InputChildData>({});

  useEffect(() => {
    if (!inputList) return;

    const tree: DataNode[] = [];
    const childData: InputChildData = {};

    // Build import sources tree
    const importTreeResult = buildImportTree({
      importSources,
      importCatalogs,
      importDatasets,
    });
    tree.push(...importTreeResult.nodes);
    Object.assign(childData, importTreeResult.childData);

    // Add file inputs (CSV and Excel)
    inputList
      .filter((a) => a.nodeType !== MetadataNodeType.FOLDER)
      .sort((a, b) => {
        return a.nodeType === MetadataNodeType.FOLDER &&
          b.nodeType === MetadataNodeType.ITEM
          ? -1
          : a.nodeType === MetadataNodeType.ITEM &&
              b.nodeType === MetadataNodeType.FOLDER
            ? 1
            : a.name.localeCompare(b.name);
      })
      .forEach((input) => {
        const isExcelFile =
          input.name.endsWith(xlsFileExtension) ||
          input.name.endsWith(xlsxFileExtension);
        const key = `${input.parentPath}-${input.name}`;

        if (isExcelFile) {
          // Build Excel file tree
          const excelTreeResult = buildExcelTree({
            input,
            key,
            excelCatalogs,
            excelSheets,
            excelTables,
          });
          tree.push(excelTreeResult.node);
          Object.assign(childData, excelTreeResult.childData);
        } else {
          // Build CSV file tree
          const fields = inputs[input.url]?.fields || [];
          const csvTreeResult = buildCSVTree({ input, fields, key });
          tree.push(csvTreeResult.node);
          Object.assign(childData, csvTreeResult.childData);
        }
      });

    setInputTree(tree);
    setChildData(childData);
  }, [
    inputList,
    inputs,
    importSources,
    importCatalogs,
    importDatasets,
    excelCatalogs,
    excelSheets,
    excelTables,
  ]);

  return { inputTree, childData };
}
