import { Dropdown, Spin, Tree } from 'antd';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { useCallback, useContext, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ColumnsIcon,
  CommonMetadata,
  DatabaseIcon,
  DownOutlinedIcon,
  DragIcon,
  FileIcon,
  MetadataNodeType,
  TableIcon,
} from '@frontend/common';

import { InputsContext, ViewportContext } from '../../../context';
import { useMoveResources } from '../../../hooks';
import { constructPath, externalSourceIconMapping } from '../../../utils';
import { CloneFile, RenameFileModal, SelectFolder } from '../../Modals';
import { PanelEmptyMessage } from '../PanelEmptyMessage';
import { getNode } from './buildTree';
import {
  importTreeKey,
  InputChildData,
  useInputsContextMenu,
} from './useInputsContextMenu';
import { useInputsDragDrop } from './useInputsDragDrop';

export function Inputs() {
  const {
    inputList,
    inputs,
    isInputsLoading,
    updateInputsFolder,
    expandFile,
    getInputs,
    importSources,
    importCatalogs,
    importDatasets,
    isImportSourcesLoading,
    expandImportSource,
    expandImportCatalog,
  } = useContext(InputsContext);
  const { viewGridData } = useContext(ViewportContext);

  const { moveResources } = useMoveResources();

  const [inputTree, setInputTree] = useState<DataNode[]>([]);
  const [childData, setChildData] = useState<InputChildData>({});
  const [hoverKey, setHoverKey] = useState('');
  const [renameItem, setRenameItem] = useState<CommonMetadata>();
  const [moveItem, setMoveItem] = useState<CommonMetadata>();
  const [cloneItem, setCloneItem] = useState<CommonMetadata>();

  const { createContextMenuItems, items, onContextMenuClick } =
    useInputsContextMenu({
      onRename: (item: CommonMetadata) => setRenameItem(item),
      onMove: (item: CommonMetadata) => setMoveItem(item),
      onClone: (item: CommonMetadata) => setCloneItem(item),
    });
  const { onDragStart } = useInputsDragDrop(childData);

  const onExpand = useCallback(
    async (node: EventDataNode<DataNode>) => {
      if (node.isLeaf) return;

      const key = node.key as string;

      // Check if it's an import source
      if (key.startsWith(importTreeKey.source)) {
        const sourceKey = key.replace(importTreeKey.source, '');
        await expandImportSource(sourceKey);

        return;
      }

      // Check if it's an import catalog (table)
      if (key.startsWith(importTreeKey.catalog)) {
        const [sourceKey, datasetKey] = key
          .replace(importTreeKey.catalog, '')
          .split(':');
        await expandImportCatalog(sourceKey, datasetKey);

        return;
      }

      // Regular file expansion
      expandFile(childData[node.key as string]);
    },
    [childData, expandFile, expandImportSource, expandImportCatalog],
  );

  const onOpenFolder = useCallback(
    (folder: CommonMetadata) => {
      updateInputsFolder({
        bucket: folder.bucket,
        parentPath: constructPath([folder.parentPath, folder.name]),
      });
    },
    [updateInputsFolder],
  );

  const handleMoveToFolder = useCallback(
    async (bucket: string, path: string | null | undefined) => {
      if (!moveItem) return;

      await moveResources([moveItem], path, bucket, () => {
        viewGridData.clearCachedViewports();

        getInputs();
      });

      setMoveItem(undefined);
    },
    [moveItem, moveResources, viewGridData, getInputs],
  );

  useEffect(() => {
    if (!inputList) return;

    const tree: DataNode[] = [];
    const childData: InputChildData = {};

    // Add import sources at the beginning
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
          const datasetNode: DataNode = {
            key: `${importTreeKey.catalog}${sourceKey}:${datasetKey}:${source.name}`,
            title: datasetKey,
            isLeaf: false,
            children: undefined,
            icon: (
              <Icon
                className="text-text-secondary w-[18px]"
                component={() => <TableIcon />}
              />
            ),
          };

          // Check if columns are loaded for this dataset
          const fullDataset = importDatasets[`${sourceKey}:${datasetKey}`];
          if (fullDataset?.schema?.columns) {
            datasetNode.children = Object.entries(
              fullDataset.schema.columns,
            ).map(([columnKey, item]) => ({
              key: `${importTreeKey.column}${sourceKey}:${datasetKey}:${columnKey}`,
              title: item.column,
              isLeaf: true,
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <ColumnsIcon />}
                />
              ),
            }));
          }

          catalogChildren.push(datasetNode);
        });

        sourceNode.children = catalogChildren;
      }

      tree.push(sourceNode);
    });

    // Add regular file inputs
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
        const fields = inputs[input.url]?.fields || [];
        const key = `${input.parentPath}-${input.name}`;

        const node = getNode(input, fields, key);
        tree.push(node);
        childData[key] = input;
      });

    setInputTree(tree);
    setChildData(childData);
  }, [inputList, inputs, importSources, importCatalogs, importDatasets]);

  return (
    <div className="overflow-auto thin-scrollbar w-full h-full bg-bg-layer-3 flex flex-col">
      {isInputsLoading || isImportSourcesLoading ? (
        <div className="flex grow items-center justify-center">
          <Spin className="z-50" size="large"></Spin>
        </div>
      ) : (!inputList || inputList.length === 0) &&
        Object.keys(importSources).length === 0 ? (
        <PanelEmptyMessage icon={<FileIcon />} message="No inputs" />
      ) : (
        <div className="min-w-[200px] pr-2 pt-2 relative">
          <Dropdown
            menu={{ items, onClick: onContextMenuClick }}
            trigger={['contextMenu']}
          >
            <div>
              <Tree.DirectoryTree
                className="bg-bg-layer-3 text-text-primary"
                defaultExpandAll={false}
                draggable={false}
                icon={false}
                loadData={onExpand}
                multiple={false}
                selectable={false}
                switcherIcon={
                  <Icon
                    className="text-text-secondary w-2"
                    component={() => <DownOutlinedIcon />}
                  />
                }
                titleRender={(node) => {
                  const key = node.key as string;
                  const isFile =
                    childData[key]?.nodeType === MetadataNodeType.ITEM;
                  const isImportCatalog = key.startsWith(importTreeKey.catalog);
                  const isDraggable = isFile || isImportCatalog;

                  return (
                    <div
                      className="flex w-full items-center justify-between select-none"
                      data-path={node.key}
                      draggable={isDraggable}
                      key={node.key}
                      onDoubleClick={() => {
                        const data = childData[key];

                        if (data?.nodeType === MetadataNodeType.FOLDER) {
                          onOpenFolder(data);
                        }
                      }}
                      onDragStart={(ev) => onDragStart(node, ev)}
                    >
                      <div className="inline-block overflow-hidden whitespace-nowrap text-ellipsis">
                        {node.title as string}
                      </div>
                      {hoverKey === node.key && isDraggable && (
                        <div className="flex items-center pointer-events-none">
                          <Icon
                            className="w-[18px] text-text-secondary mr-1"
                            component={() => <DragIcon />}
                          />

                          <span className="text-[13px] text-text-secondary">
                            Drag
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
                treeData={inputTree}
                onMouseEnter={(e) => {
                  setHoverKey(e.node.key as string);
                }}
                onMouseLeave={() => {
                  setHoverKey('');
                }}
                onRightClick={(info) => createContextMenuItems(info, childData)}
              />
            </div>
          </Dropdown>

          {renameItem && (
            <RenameFileModal
              item={renameItem}
              onModalClose={() => {
                viewGridData.clearCachedViewports();
                setRenameItem(undefined);
                getInputs();
              }}
            />
          )}
          {moveItem && (
            <SelectFolder
              initialBucket={moveItem.bucket}
              initialPath={moveItem.parentPath}
              onCancel={() => setMoveItem(undefined)}
              onOk={handleMoveToFolder}
            />
          )}
          {cloneItem && (
            <CloneFile
              item={cloneItem}
              onModalClose={() => {
                setCloneItem(undefined);
                getInputs();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
