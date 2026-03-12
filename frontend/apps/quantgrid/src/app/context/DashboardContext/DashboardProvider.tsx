import Fuse from 'fuse.js';
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { toast } from 'react-toastify';

import {
  ApiError,
  ApiErrorType,
  CommonMetadata,
  csvFileExtension,
  defaultFolderName,
  dialProjectFileExtension,
  filesEndpointType,
  MetadataNodeType,
  MetadataResourceType,
  publicBucket,
  ResourceMetadata,
  SharedByMeMetadata,
  SharedWithMeMetadata,
} from '@frontend/common';

import { PreUploadFile } from '../../components';
import { useApiRequests } from '../../hooks';
import {
  createUniqueName,
  deleteRecentProjectFromRecentProjects,
  getRecentProjects,
} from '../../services';
import { useChangeNameModalStore, useUserSettingsStore } from '../../store';
import { routeParams } from '../../types';
import {
  DashboardFilter,
  DashboardItem,
  DashboardSortFn,
  DashboardSortType,
  DashboardTab,
} from '../../types/dashboard';
import {
  constructPath,
  dashboardFuseOptions,
  encodeApiUrl,
  filterDashboardItems,
  getDashboardNavigateUrl,
  isEntityNameInvalid,
  routeToTabMap,
  sortDashboardItems,
} from '../../utils';
import { ApiContext } from '../ApiContext';
import { DashboardContext } from './DashboardContext';

type Props = {
  children: ReactNode;
};

type AsyncResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export function DashboardContextProvider({ children }: Props) {
  const {
    getFiles,
    getSharedByMeResources,
    getSharedWithMeResources,
    createFile,
    getDimensionalSchema,
    createFolder,
    getResourceMetadata,
  } = useApiRequests();
  const { userBucket } = useContext(ApiContext);
  const showHiddenFiles = useUserSettingsStore((s) => s.data.showHiddenFiles);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { '*': splat } = useParams();

  const [currentTab, setCurrentTab] = useState<DashboardTab | null>(null);
  const [folderPath, setFolderPath] = useState<string | null | undefined>(null);
  const [folderBucket, setFolderBucket] = useState<string | null | undefined>(
    null,
  );
  const [searchValue, setSearchValue] = useState<string>('');
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [sortType, setSortType] = useState<DashboardSortType>('name');
  const sortFnRef = useRef<DashboardSortFn | undefined>(undefined);
  const [selectedItems, setSelectedItems] = useState<DashboardItem[]>([]);
  const recentItemsRef = useRef<DashboardItem[]>([]);
  const allItemsRef = useRef<DashboardItem[]>([]);
  const allItemsRecursiveRef = useRef<DashboardItem[] | null>(null);
  const examplesItemsRecursiveRef = useRef<DashboardItem[] | null>(null);
  const sharedByMeItemsRef = useRef<
    DashboardItem<ResourceMetadata | SharedByMeMetadata>[]
  >([]);
  const sharedWithMeItemsRef = useRef<
    DashboardItem<ResourceMetadata | SharedWithMeMetadata>[]
  >([]);
  const examplesItemsRef = useRef<DashboardItem[]>([]);
  const [displayedDashboardItems, setDisplayedDashboardItems] = useState<
    DashboardItem<
      ResourceMetadata | SharedByMeMetadata | SharedWithMeMetadata
    >[]
  >([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingError, setLoadingError] = useState<ApiError | null>(null);

  const [uploadFileDisplayed, setUploadFileDisplayed] = useState(false);
  const [uploadFilePath, setUploadFilePath] = useState<
    string | null | undefined
  >(null);
  const [uploadFileBucket, setUploadFileBucket] = useState<
    string | null | undefined
  >(null);
  const [uploadingFiles, setUploadingFiles] = useState<FileList | undefined>(
    undefined,
  );

  const filterFiles = useCallback(
    (file: DashboardItem<CommonMetadata>) => {
      return file.name && (showHiddenFiles || !file.name.startsWith('.'));
    },
    [showHiddenFiles],
  );

  const sortChange = useCallback(
    (
      newSortType: DashboardSortType,
      newSortFn: DashboardSortFn | undefined,
    ) => {
      setSortAsc(newSortType !== sortType ? true : !sortAsc);
      setSortType(newSortType);
      sortFnRef.current = newSortFn;
      setDisplayedDashboardItems(
        sortDashboardItems(
          displayedDashboardItems,
          newSortType,
          newSortFn,
          newSortType !== sortType ? true : !sortAsc,
        ),
      );
    },
    [displayedDashboardItems, sortAsc, sortType],
  );

  const searchSharedByMeItems = useCallback(async (): Promise<
    | {
        success: true;
        data: DashboardItem<ResourceMetadata | SharedByMeMetadata>[];
      }
    | { success: false; error: ApiError }
  > => {
    let result:
      | {
          success: true;
          data: DashboardItem<ResourceMetadata | SharedByMeMetadata>[];
        }
      | {
          success: false;
          error: { type: string; message: string; statusCode?: number };
        };

    if (folderPath) {
      result = await getFiles({
        path: `${folderBucket}/${folderPath ? folderPath + '/' : ''}`,
      });
    } else {
      result = await getSharedByMeResources({
        resourceType: MetadataResourceType.FILE,
      });
    }

    if (!result.success) {
      return {
        success: false,
        error: {
          type: result.error.type as ApiErrorType,
          message: result.error.message,
          statusCode: result.error.statusCode,
        },
      };
    }

    return {
      success: true,
      data: result.data.map((item) => ({ ...item, isSharedByMe: true })),
    };
  }, [folderBucket, folderPath, getFiles, getSharedByMeResources]);

  const searchSharedWithMeItems = useCallback(async (): Promise<
    | {
        success: true;
        data: DashboardItem<ResourceMetadata | SharedWithMeMetadata>[];
      }
    | { success: false; error: ApiError }
  > => {
    let result:
      | {
          success: true;
          data: DashboardItem<ResourceMetadata | SharedWithMeMetadata>[];
        }
      | {
          success: false;
          error: ApiError;
        };

    if (folderPath) {
      result = await getFiles({
        path: `${folderBucket}/${folderPath ? folderPath + '/' : ''}`,
      });
    } else {
      result = await getSharedWithMeResources({
        resourceType: MetadataResourceType.FILE,
      });
    }

    if (!result.success) {
      return {
        success: false,
        error: {
          type: result.error.type as ApiErrorType,
          message: result.error.message,
          statusCode: result.error.statusCode,
        },
      };
    }

    return { success: true, data: result.data };
  }, [folderBucket, folderPath, getFiles, getSharedWithMeResources]);

  const searchExamplesItems = useCallback(
    async (isRecursive = false): Promise<AsyncResult<ResourceMetadata[]>> => {
      const result = await getFiles({
        path: `${publicBucket}/${folderPath ? folderPath + '/' : ''}`,
        isRecursive,
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            type: result.error.type as ApiErrorType,
            message: result.error.message,
            statusCode: result.error.statusCode,
          },
        };
      }

      return { success: true, data: result.data };
    },
    [folderPath, getFiles],
  );

  const searchAllItems = useCallback(
    async (isRecursive = false): Promise<AsyncResult<DashboardItem[]>> => {
      const results = await Promise.allSettled([
        getFiles({
          path: `${userBucket}/${folderPath ? folderPath + '/' : ''}`,
          isRecursive,
        }),
        getSharedByMeResources({
          resourceType: MetadataResourceType.FILE,
        }),
      ]);

      const filesResult =
        results[0].status === 'fulfilled' ? results[0].value : undefined;
      const sharedResult =
        results[1].status === 'fulfilled' ? results[1].value : undefined;

      if (!sharedResult || !sharedResult.success) {
        return {
          success: false,
          error: {
            type: sharedResult?.error?.type ?? ApiErrorType.Unknown,
            message:
              sharedResult?.error?.message ?? 'Failed to load shared files',
            statusCode: sharedResult?.error?.statusCode,
          },
        };
      }

      if (!filesResult || !filesResult.success) {
        return {
          success: false,
          error: {
            type: filesResult?.error.type || ApiErrorType.Unknown,
            message: filesResult?.error?.message || 'Failed to load files',
            statusCode: filesResult?.error?.statusCode,
          },
        };
      }

      return {
        success: true,
        data: filesResult.data.map((item) => {
          const isPresentedInSharedItems = sharedResult?.data?.some(
            (sharedItem) =>
              sharedItem.parentPath === item.parentPath &&
              sharedItem.name === item.name,
          );
          if (isPresentedInSharedItems) {
            return {
              ...item,
              isSharedByMe: true,
            };
          }

          return item;
        }),
      };
    },
    [folderPath, getFiles, getSharedByMeResources, userBucket],
  );

  const searchRecentItems = useCallback(async (): Promise<
    AsyncResult<DashboardItem[]>
  > => {
    const recentProjects = getRecentProjects();

    if (!recentProjects) return { success: true, data: [] };

    const sharedResult = await getSharedWithMeResources({
      resourceType: MetadataResourceType.FILE,
    });

    const items: DashboardItem[] = recentProjects.map(
      (recentProject): DashboardItem<ResourceMetadata> => {
        const resultedUrl = encodeApiUrl(
          constructPath([
            filesEndpointType,
            recentProject.projectBucket,
            recentProject.projectPath,
            recentProject.projectName + dialProjectFileExtension,
          ]),
        );

        const sharedResultData = sharedResult.success ? sharedResult.data : [];
        const sharedAuthor = sharedResultData.find(
          (item) => item.url === resultedUrl,
        )?.author;

        return {
          name: recentProject.projectName + dialProjectFileExtension,
          nodeType: MetadataNodeType.ITEM,
          parentPath: recentProject.projectPath,
          bucket: recentProject.projectBucket,
          updatedAt: recentProject.timestamp,
          resourceType: MetadataResourceType.FILE,
          url: resultedUrl,
          contentLength: 0,
          contentType: 'application/octet-stream',
          items: [],
          owner:
            sharedAuthor ??
            (recentProject.projectBucket === publicBucket
              ? 'Public'
              : recentProject.projectBucket === userBucket
                ? 'Me'
                : '-'),
        };
      },
    );

    const itemsMetadata = await Promise.all(
      items.map(async (item) => {
        const metadata = await getResourceMetadata({
          path: constructPath([item.bucket, item.parentPath, item.name]),
          suppressErrors: true,
          resourceType: MetadataResourceType.FILE,
        });

        if (!metadata.success) {
          deleteRecentProjectFromRecentProjects(
            item.name.replaceAll(dialProjectFileExtension, ''),
            item.bucket,
            item.parentPath,
          );
        }

        return metadata.success ? item : null;
      }),
    );

    const filteredItems = itemsMetadata.filter(
      (item): item is DashboardItem => item !== null,
    );

    return { success: true, data: filteredItems };
  }, [getResourceMetadata, getSharedWithMeResources, userBucket]);

  const search = useCallback((searchValue: string) => {
    setSearchValue(searchValue);
  }, []);

  const updateDashboardItems = useCallback(
    async (withRefetch?: boolean) => {
      let items: DashboardItem<
        ResourceMetadata | SharedByMeMetadata | SharedWithMeMetadata
      >[] = [];
      setLoadingDashboard(true);
      setLoadingError(null);

      let result: AsyncResult<
        DashboardItem<
          ResourceMetadata | SharedByMeMetadata | SharedWithMeMetadata
        >[]
      >;

      switch (currentTab) {
        case 'home':
          if (searchValue) {
            result =
              allItemsRecursiveRef.current && !withRefetch
                ? { success: true, data: allItemsRecursiveRef.current }
                : await searchAllItems(true);
            if (result.success) {
              allItemsRecursiveRef.current = result.data;
            }
          } else {
            result = withRefetch
              ? await searchAllItems()
              : allItemsRef.current.length > 0
                ? { success: true, data: allItemsRef.current }
                : await searchAllItems();
            if (result.success) {
              allItemsRef.current = result.data;
              allItemsRecursiveRef.current = null;
            }
          }
          break;
        case 'recent': {
          result = withRefetch
            ? await searchRecentItems()
            : recentItemsRef.current.length > 0
              ? { success: true, data: recentItemsRef.current }
              : await searchRecentItems();
          if (result.success) {
            recentItemsRef.current = result.data;
          }
          break;
        }
        case 'sharedByMe': {
          result = withRefetch
            ? await searchSharedByMeItems()
            : sharedByMeItemsRef.current.length > 0
              ? { success: true, data: sharedByMeItemsRef.current }
              : await searchSharedByMeItems();
          if (result.success) {
            sharedByMeItemsRef.current = result.data as DashboardItem<
              ResourceMetadata | SharedByMeMetadata
            >[];
          }
          break;
        }
        case 'sharedWithMe': {
          result = withRefetch
            ? await searchSharedWithMeItems()
            : sharedWithMeItemsRef.current.length > 0
              ? { success: true, data: sharedWithMeItemsRef.current }
              : await searchSharedWithMeItems();
          if (result.success) {
            sharedWithMeItemsRef.current = result.data;
          }
          break;
        }
        case 'examples':
          if (searchValue) {
            result = examplesItemsRecursiveRef.current
              ? { success: true, data: examplesItemsRecursiveRef.current }
              : await searchExamplesItems(true);
            if (result.success) {
              examplesItemsRecursiveRef.current = result.data;
            }
          } else {
            result = withRefetch
              ? await searchExamplesItems()
              : examplesItemsRef.current.length > 0
                ? { success: true, data: examplesItemsRef.current }
                : await searchExamplesItems();
            if (result.success) {
              examplesItemsRef.current = result.data;
              examplesItemsRecursiveRef.current = null;
            }
          }
          break;
        default:
          setLoadingDashboard(false);

          return;
      }

      if (!result.success) {
        setLoadingError(result.error);
        setLoadingDashboard(false);
        setSelectedItems([]);

        return;
      }

      items = result.data;

      const itemsFuse = new Fuse(items, dashboardFuseOptions);
      const resultItems = searchValue
        ? itemsFuse.search(searchValue).map((i) => i.item)
        : items;
      const sortedResultItems = sortDashboardItems(
        resultItems.filter((i) => i.name),
        sortType,
        sortFnRef.current,
        sortAsc,
      );
      const filteredItems = filterDashboardItems(
        sortedResultItems,
        filter,
      ).filter(filterFiles);
      setDisplayedDashboardItems(filteredItems);
      setLoadingDashboard(false);
      setSelectedItems([]);
    },
    [
      currentTab,
      filter,
      filterFiles,
      searchAllItems,
      searchExamplesItems,
      searchRecentItems,
      searchSharedByMeItems,
      searchSharedWithMeItems,
      searchValue,
      sortAsc,
      sortType,
    ],
  );

  const refetchData = useCallback(() => {
    updateDashboardItems(true);
  }, [updateDashboardItems]);

  const uploadFiles = useCallback(
    (path: string | null, bucket: string, files?: FileList) => {
      setUploadFilePath(path);
      setUploadFileBucket(bucket);
      setUploadFileDisplayed(true);
      setUploadingFiles(files);
    },
    [],
  );

  const handleUploadFiles = useCallback(
    async (
      parentPath: string | null | undefined,
      bucket: string,
      files: { file: File; name: string; extension: string }[],
    ) => {
      setUploadFileDisplayed(false);

      if (!bucket || !files) return;

      let uploadingToast;
      if (files.length > 1) {
        uploadingToast = toast.loading(`Uploading files...`);
      } else {
        uploadingToast = toast.loading(`File '${files[0].name}' uploading...`);
      }

      const requests = files.map(async (file) => {
        const result = await createFile({
          bucket,
          fileName: file.name + file.extension,
          fileType: file.file.type,
          fileBlob: file.file,
          path: parentPath,
        });

        if (result.success) {
          const toastText = `File '${result.data.file.name}' uploaded successfully`;

          toast.success(toastText, {});
        } else {
          toast.error(
            `Error happened during uploading "${file.name + file.extension}"`,
          );
        }

        return result.success ? result.data.file : undefined;
      });

      const results = await Promise.allSettled(requests);
      results.forEach(async (result) => {
        if (
          result.status === 'fulfilled' &&
          result.value &&
          result.value.name.endsWith(csvFileExtension)
        ) {
          const { url } = result.value;

          if (!url) return;

          const dimResult = await getDimensionalSchema({
            formula: `INPUT("${url}")`,
            worksheets: {},
            suppressErrors: true,
          });

          if (!dimResult.success) {
            toast.error(
              `Error happened during creating schema for file "${result.value.name}". Recheck file structure and reupload it.`,
            );

            return;
          }
        }
      });

      toast.dismiss(uploadingToast);

      refetchData();
    },
    [createFile, getDimensionalSchema, refetchData],
  );

  const createEmptyFolder = useCallback(
    async ({
      path,
      bucket,
      newFolderName,
      silent,
    }: {
      path: string | null;
      bucket: string;
      newFolderName?: string;
      silent?: boolean;
    }) => {
      setSearchValue('');
      setSelectedItems([]);

      if (!silent || !newFolderName) {
        const initialName = createUniqueName(
          defaultFolderName,
          displayedDashboardItems
            .filter(({ nodeType }) => nodeType === MetadataNodeType.FOLDER)
            .map(({ name }) => name),
        );

        const open = useChangeNameModalStore.getState().open;

        const result = await open({
          kind: 'createFolder',
          initialName,
          validate: (name) => {
            if (!name) return 'Folder name is required';
            if (isEntityNameInvalid(name)) return 'Invalid characters';
            if (
              displayedDashboardItems.some(
                (item) =>
                  item.nodeType === MetadataNodeType.FOLDER &&
                  item.name.toLowerCase() === name.toLowerCase(),
              )
            )
              return 'Folder with this name already exists';

            return;
          },
        });

        if (result) {
          createEmptyFolder({
            newFolderName: result,
            path,
            bucket,
            silent: true,
          });
        }

        return;
      }

      if (path?.split('/').length === 4) {
        toast.error(`It's not allowed to create more than 4 nested folders`);

        return;
      }

      if (!bucket) return;

      const result = await createFolder({
        bucket,
        parentPath: path,
        name: newFolderName,
      });

      if (!result.success) return;

      const toastText = `Folder '${newFolderName}' created successfully`;
      toast.success(toastText, {});

      if (
        (bucket === folderBucket && path === folderPath) ||
        (bucket === userBucket && !folderPath && currentTab === 'home')
      ) {
        refetchData();
      }
    },
    [
      createFolder,
      currentTab,
      displayedDashboardItems,
      folderBucket,
      folderPath,
      refetchData,
      userBucket,
    ],
  );

  useEffect(() => {
    if (userBucket) {
      updateDashboardItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchValue, showHiddenFiles, userBucket]);

  useEffect(() => {
    if (userBucket) {
      updateDashboardItems(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, folderPath, folderBucket, userBucket]);

  useEffect(() => {
    if (!userBucket) return;

    const route =
      Object.keys(routeToTabMap).find((route) =>
        location.pathname.startsWith(route),
      ) || '/home';
    const folderBucket = searchParams.get(routeParams.folderBucket);
    const folderPath = splat;
    const tab = routeToTabMap[route];

    if (location.pathname === '/' || !tab) {
      navigate(
        getDashboardNavigateUrl({
          folderBucket: null,
          folderPath: null,
          tab: tab,
        }),
      );

      return;
    }

    if (currentTab !== tab) {
      if (tab === 'recent' || tab === 'home') {
        sortChange('updatedAt', undefined);
        setSortAsc(false);
      } else {
        sortChange('name', undefined);
        setSortAsc(true);
      }
    }

    setCurrentTab(tab);
    setFolderPath(folderPath);
    setFolderBucket(folderBucket);
    setSearchValue('');
    setSelectedItems([]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, userBucket]);

  return (
    <DashboardContext.Provider
      value={{
        currentTab,
        search,
        setSearchValue,
        searchValue,
        sortChange,
        sortAsc,
        sortType,
        displayedDashboardItems,
        filter,
        setFilter,
        folderPath,
        folderBucket,
        loadingDashboard,
        loadingError,
        refetchData,
        uploadFiles,
        createEmptyFolder,
        selectedItems,
        setSelectedItems,
      }}
    >
      {children}

      {uploadFileDisplayed && uploadFileBucket && (
        <PreUploadFile
          hideFilesSelectionOnOpen={!!uploadingFiles}
          initialBucket={uploadFileBucket}
          initialFiles={uploadingFiles}
          initialPath={uploadFilePath}
          onCancel={() => setUploadFileDisplayed(false)}
          onOk={handleUploadFiles}
        />
      )}
    </DashboardContext.Provider>
  );
}
