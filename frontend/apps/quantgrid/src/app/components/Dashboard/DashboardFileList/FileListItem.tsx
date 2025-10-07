import { Checkbox } from 'antd';
import cx from 'classnames';
import classNames from 'classnames';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '@ant-design/icons';
import {
  ArrowUpRightIcon,
  ColumnDataType,
  csvFileExtension,
  CSVFileIcon,
  csvTempFolder,
  defaultSheetName,
  dialProjectFileExtension,
  DotsIcon,
  FileIcon,
  FolderIcon,
  MetadataNodeType,
  projectFoldersRootPrefix,
  QGLogo,
} from '@frontend/common';

import { ApiContext, AppContext, DashboardContext } from '../../../context';
import { useApiRequests, useCreateTableDsl } from '../../../hooks';
import { DashboardItem, DashboardListColumn } from '../../../types/dashboard';
import {
  constructPath,
  encodeApiUrl,
  getDashboardNavigateUrl,
  getProjectNavigateUrl,
  isProjectMetadata,
} from '../../../utils';
import { FileListItemMenu } from './FileListItemMenu';

type Props = {
  item: DashboardItem;
  columns: DashboardListColumn[];
};

export function FileListItem({ item, columns }: Props) {
  const { setLoading } = useContext(AppContext);
  const { userBucket } = useContext(ApiContext);
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const { currentTab, selectedItems, setSelectedItems } =
    useContext(DashboardContext);
  const {
    createProject: createProjectRequest,
    getDimensionalSchema: getDimensionalSchemaRequest,
  } = useApiRequests();
  const { getDimensionalTableFromFormula } = useCreateTableDsl();

  const isProject = useMemo(() => isProjectMetadata(item), [item]);

  const isCSV = useMemo(
    () =>
      item.name.endsWith(csvFileExtension) &&
      item.nodeType === MetadataNodeType.ITEM,
    [item]
  );

  const isFolder = useMemo(
    () => item.nodeType === MetadataNodeType.FOLDER,
    [item]
  );

  const itemLink = useMemo(() => {
    return isProject
      ? getProjectNavigateUrl({
          projectName: item.name.replaceAll(dialProjectFileExtension, ''),
          projectBucket: item.bucket,
          projectPath: item.parentPath,
        })
      : isFolder
      ? getDashboardNavigateUrl({
          folderPath: `${item.parentPath ? item.parentPath + '/' : ''}${
            item.name
          }`,
          folderBucket: item.bucket,
          tab: currentTab!,
        })
      : '';
  }, [
    currentTab,
    isFolder,
    isProject,
    item.bucket,
    item.name,
    item.parentPath,
  ]);

  const itemIcon = useMemo(() => {
    if (isFolder) {
      return <FolderIcon />;
    }

    if (isCSV) {
      return (
        <Icon
          className="text-text-accent-secondary"
          component={() => <CSVFileIcon />}
        ></Icon>
      );
    }

    if (isProject) {
      return <QGLogo />;
    }

    return <FileIcon />;
  }, [isFolder, isCSV, isProject]);

  const Tag = isFolder || isProject ? Link : 'div';

  const onSelectItem = useCallback(() => {
    if (isSelected) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  }, [isSelected, item, selectedItems, setSelectedItems]);

  const handleItemClick = useCallback(async () => {
    // Ignore not csv file clicks
    if (!isCSV || !userBucket) return;

    setLoading(true);
    const formula = `INPUT("${encodeApiUrl(
      constructPath(['files', item.bucket, item.parentPath, item.name])
    )}")`;

    const dimensionalSchema = await getDimensionalSchemaRequest({
      formula,
      worksheets: {},
    });

    if (!dimensionalSchema) {
      setLoading(false);

      return;
    }

    const { dsl } = getDimensionalTableFromFormula(
      'Table1',
      true,
      '',
      formula,
      dimensionalSchema.dimensionalSchemaResponse.schema,
      dimensionalSchema.dimensionalSchemaResponse.keys,
      1,
      1,
      ColumnDataType.TABLE_VALUE
    );

    const projectName = item.name.replaceAll(csvFileExtension, '');
    const projectPath = constructPath([
      projectFoldersRootPrefix,
      csvTempFolder,
      item.parentPath,
    ]);

    const res = await createProjectRequest({
      bucket: userBucket,
      path: projectPath,
      projectName,
      initialProjectData: {
        [defaultSheetName]: dsl,
      },
      forceCreation: true,
    });

    if (!res) {
      setLoading(false);

      return;
    }

    setLoading(false);

    window.open(
      getProjectNavigateUrl({
        projectName,
        projectBucket: userBucket,
        projectPath,
        projectSheetName: defaultSheetName,
      })
    );
  }, [
    createProjectRequest,
    getDimensionalSchemaRequest,
    getDimensionalTableFromFormula,
    isCSV,
    item.bucket,
    item.name,
    item.parentPath,
    setLoading,
    userBucket,
  ]);

  useEffect(() => {
    setIsSelected(selectedItems.includes(item));
  }, [item, selectedItems]);

  return (
    <div
      className="relative flex flex-col group min-w-[400px]"
      data-file-name={item.name}
    >
      <FileListItemMenu
        className="flex flex-col"
        isFolder={isFolder}
        item={item}
        trigger={['contextMenu']}
      >
        <Tag
          className={cx(
            'flex items-center border-b border-b-stroke-tertiary h-[45px]',
            {
              'cursor-pointer': isProject || isFolder || isCSV,
              'bg-bg-accent-primary-alpha': isHovered || isSelected,
            }
          )}
          target={isProject ? '_blank' : '_self'}
          to={itemLink}
          onClick={handleItemClick}
          onMouseLeave={() => setIsHovered(false)}
          onMouseOver={() => setIsHovered(true)}
        >
          <div className="flex grow items-center overflow-hidden leading-none w-full">
            {columns.map((column, index) => (
              <div
                className={classNames(
                  'flex items-center gap-2 md:gap-4 overflow-hidden text-ellipsis',
                  column.classNames
                )}
                key={column.title}
              >
                {index === 0 ? (
                  <div className="text-lg flex items-center justify-center relative">
                    {!isFolder && (isHovered || isSelected) ? (
                      <Checkbox
                        checked={isSelected}
                        className="w-[18px] h-[18px]"
                        rootClassName="dial-xl-checkbox"
                        onChange={onSelectItem}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <Icon
                          className={cx('w-[18px]', {
                            'text-text-secondary': !isProject,
                            'text-transparent': isProject,
                          })}
                          component={() => itemIcon}
                        ></Icon>
                        {item.isSharedByMe && (
                          <span className="p-[2px] absolute bottom-0 -left-px flex items-center justify-center bg-bg-layer-3 rounded-tr">
                            <Icon
                              className="w-[7px] text-text-accent-secondary"
                              component={() => <ArrowUpRightIcon />}
                            ></Icon>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ) : null}

                <span
                  className="text-text-primary text-sm select-none overflow-hidden text-ellipsis text-nowrap"
                  title={
                    typeof column.formatValue(item) === 'string'
                      ? (column.formatValue(item) as string)
                      : ''
                  }
                >
                  {column.formatValue(item)}
                </span>
              </div>
            ))}
          </div>
          <div className="w-6"></div>
        </Tag>
      </FileListItemMenu>
      <FileListItemMenu
        className="absolute top-[calc((100%-18px)/2)] right-0 w-6 flex items-center justify-center pr-4 cursor-pointer mr-4 text-transparent group-hover:text-text-secondary hover:group-hover:text-text-accent-primary"
        isFolder={isFolder}
        item={item}
        trigger={['click', 'contextMenu']}
      >
        <Icon
          className="w-[18px] shrink-0"
          component={() => <DotsIcon />}
          onClick={(e) => e.stopPropagation()}
        />
      </FileListItemMenu>
    </div>
  );
}
