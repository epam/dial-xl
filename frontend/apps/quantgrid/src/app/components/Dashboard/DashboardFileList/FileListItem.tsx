import { Checkbox } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '@ant-design/icons';
import {
  ArrowUpRightIcon,
  csvFileExtension,
  CSVFileIcon,
  csvTempFolder,
  dialProjectFileExtension,
  DotsIcon,
  FileIcon,
  FolderIcon,
  formatBytes,
  getFormattedFullDate,
  projectFoldersRootPrefix,
  QGLogo,
} from '@frontend/common';

import {
  ApiContext,
  AppContext,
  DashboardContext,
  defaultSheetName,
} from '../../../context';
import { useApiRequests, useCreateTableDsl } from '../../../hooks';
import { DashboardItem } from '../../../types/dashboard';
import {
  constructPath,
  encodeApiUrl,
  getDashboardNavigateUrl,
  getProjectNavigateUrl,
} from '../../../utils';
import { FileListItemMenu } from './FileListItemMenu';

type Props = {
  item: DashboardItem;
};

export function FileListItem({ item }: Props) {
  const { setLoading } = useContext(AppContext);
  const { userBucket } = useContext(ApiContext);
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const {
    currentTab,
    folderPath,
    searchValue,
    selectedItems,
    setSelectedItems,
  } = useContext(DashboardContext);
  const {
    createProject: createProjectRequest,
    getDimensionalSchema: getDimensionalSchemaRequest,
  } = useApiRequests();
  const { getDimensionalTableFromFormula } = useCreateTableDsl();

  const isProject = useMemo(
    () => item.name.endsWith(dialProjectFileExtension),
    [item]
  );

  const isCSV = useMemo(() => item.name.endsWith(csvFileExtension), [item]);

  const isSimplifiedColumns =
    currentTab === 'recent' || (currentTab === 'sharedByMe' && !folderPath);

  const isSearchColumns = searchValue !== '';

  const isFolder = useMemo(() => item.nodeType === 'FOLDER', [item]);

  const isSharedWithMe = useMemo(
    () => item.bucket !== userBucket,
    [item.bucket, userBucket]
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
          className="text-textAccentSecondary"
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

  const onSelectItem = useCallback(
    (e: CheckboxChangeEvent) => {
      if (isSelected) {
        setSelectedItems(selectedItems.filter((i) => i !== item));
      } else {
        setSelectedItems([...selectedItems, item]);
      }
    },
    [isSelected, item, selectedItems, setSelectedItems]
  );

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
      1
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
    <div className="relative flex flex-col group" data-file-name={item.name}>
      <FileListItemMenu
        className="flex flex-col"
        isFolder={isFolder}
        item={item}
        trigger={'contextMenu'}
      >
        <Tag
          className={cx('flex py-3 border-b border-b-strokeTertiary', {
            'cursor-pointer': isProject || isFolder || isCSV,
            'bg-bgAccentPrimaryAlpha': isHovered || isSelected,
          })}
          target={isProject ? '_blank' : '_self'}
          to={itemLink}
          onClick={handleItemClick}
          onMouseLeave={() => setIsHovered(false)}
          onMouseOver={() => setIsHovered(true)}
        >
          <div className="flex grow items-center overflow-x-hidden">
            <div className="flex items-center min-w-[60%] pl-4 pr-2 gap-4 overflow-hidden text-ellipsis">
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
                        'text-textSecondary': !isProject,
                        'text-transparent': isProject,
                      })}
                      component={() => itemIcon}
                    ></Icon>
                    {item.isSharedByMe && (
                      <span className="p-[2px] absolute bottom-0 left-[-1px] flex items-center justify-center bg-bgLayer3 rounded-tr">
                        <Icon
                          className="w-[7px] text-textAccentSecondary"
                          component={() => <ArrowUpRightIcon />}
                        ></Icon>
                      </span>
                    )}
                  </>
                )}
              </div>

              <span
                className="text-textPrimary text-sm select-none overflow-hidden text-ellipsis text-nowrap"
                title={getDisplayName(item.name)}
              >
                {getDisplayName(item.name)}
              </span>
            </div>
            {(isSimplifiedColumns || isSearchColumns) && (
              <div className="min-w-[20%] pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
                <span
                  className="text-textSecondary text-sm select-none"
                  title={
                    isSharedWithMe
                      ? 'Shared with me'
                      : `Home${item.parentPath ? '/' + item.parentPath : ''}`
                  }
                >
                  {isSharedWithMe
                    ? 'Shared with me'
                    : `Home${item.parentPath ? '/' + item.parentPath : ''}`}
                </span>
              </div>
            )}
            <div className="min-w-[20%] pr-2">
              <span className="text-textSecondary text-sm select-none">
                {item.nodeType === 'ITEM' && item.updatedAt
                  ? getFormattedFullDate(item.updatedAt)
                  : '-'}
              </span>
            </div>
            {!isSimplifiedColumns && !isSearchColumns && (
              <div className="min-w-[20%] pr-2">
                <span className="text-textSecondary text-sm select-none">
                  {item.contentLength ? formatBytes(item.contentLength) : '-'}
                </span>
              </div>
            )}
          </div>
          <div className="w-6"></div>
        </Tag>
      </FileListItemMenu>
      <FileListItemMenu
        className="absolute top-4 right-0 w-6 flex items-center justify-center pr-4 cursor-pointer mr-4 text-transparent group-hover:text-textSecondary group-hover:hover:text-textAccentPrimary"
        isFolder={isFolder}
        item={item}
        trigger={'click'}
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

function getDisplayName(name: string): string {
  return name.replace(dialProjectFileExtension, '');
}
