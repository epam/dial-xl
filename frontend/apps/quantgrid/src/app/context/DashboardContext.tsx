import Fuse from 'fuse.js';
import {
  createContext,
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
} from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  csvFileExtension,
  dialProjectFileExtension,
  FilesMetadata,
  MetadataNodeType,
  MetadataResourceType,
  publicBucket,
} from '@frontend/common';

import {
  DashboardFilter,
  DashboardSortType,
  DashboardTab,
  NewFolderModalRefFunction,
} from '../common';
import { NewDashboardFolder, PreUploadFile } from '../components';
import { useApiRequests } from '../hooks';
import {
  deleteRecentProjectFromRecentProjects,
  getRecentProjects,
} from '../services';
import { routeParams } from '../types';
import { DashboardItem } from '../types/dashboard';
import {
  constructPath,
  dashboardFuseOptions,
  filterDashboardItems,
  getDashboardNavigateUrl,
  routeToTabMap,
  sortDashboardItems,
} from '../utils';
import { ApiContext } from './ApiContext';
import { AppContext } from './AppContext';

type DashboardContextActions = {
  setSearchValue: (value: string) => void;
  search: (searchValue: string) => void;
  sortChange: (newSortType: DashboardSortType) => void;
  setFilter: (filter: DashboardFilter) => void;
  refetchData: () => void;
  uploadFiles: (path: string | null, bucket: string) => void;
  createEmptyFolder: (args: {
    path: string | null;
    bucket: string;
    newFolderName?: string;
    silent?: boolean;
  }) => void;
  setSelectedItems: (selectedItems: DashboardItem[]) => void;
};

type DashboardContextValues = {
  currentTab: DashboardTab | null;
  searchValue: string;
  folderPath: string | null | undefined;
  folderBucket: string | null | undefined;
  sortAsc: boolean;
  sortType: DashboardSortType;
  filter: DashboardFilter;
  displayedDashboardItems: DashboardItem[];
  loadingDashboard: boolean;
  selectedItems: DashboardItem[];
};

export const DashboardContext = createContext<
  DashboardContextActions & DashboardContextValues
>({} as DashboardContextActions & DashboardContextValues);

type Props = {
  children: ReactNode;
};

export function DashboardContextProvider({ children }: Props) {
  const {
    getFiles,
    getSharedByMeFiles,
    getSharedWithMeFiles,
    createFile,
    getDimensionalSchema,
    createFolder,
    getResourceMetadata,
  } = useApiRequests();
  const { userBucket } = useContext(ApiContext);
  const { showHiddenFiles } = useContext(AppContext);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { '*': splat } = useParams();

  const [currentTab, setCurrentTab] = useState<DashboardTab | null>(null);
  const [folderPath, setFolderPath] = useState<string | null | undefined>(null);
  const [folderBucket, setFolderBucket] = useState<string | null | undefined>(
    null
  );
  const [searchValue, setSearchValue] = useState<string>('');
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [sortType, setSortType] = useState<DashboardSortType>('name');
  const [selectedItems, setSelectedItems] = useState<DashboardItem[]>([]);
  const recentItemsRef = useRef<DashboardItem[]>([]);
  const allItemsRef = useRef<DashboardItem[]>([]);
  const allItemsRecursiveRef = useRef<DashboardItem[] | null>(null);
  const examplesItemsRecursiveRef = useRef<DashboardItem[] | null>(null);
  const sharedByMeItemsRef = useRef<DashboardItem[]>([]);
  const sharedWithMeItemsRef = useRef<DashboardItem[]>([]);
  const examplesItemsRef = useRef<DashboardItem[]>([]);
  const [displayedDashboardItems, setDisplayedDashboardItems] = useState<
    DashboardItem[]
  >([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const createNewFolderModal = useRef<NewFolderModalRefFunction | null>(null);

  const [uploadFileDisplayed, setUploadFileDisplayed] = useState(false);
  const [uploadFilePath, setUploadFilePath] = useState<
    string | null | undefined
  >(null);
  const [uploadFileBucket, setUploadFileBucket] = useState<
    string | null | undefined
  >(null);

  const filterFiles = useCallback(
    (file: DashboardItem) => {
      return file.name && (showHiddenFiles || !file.name.startsWith('.'));
    },
    [showHiddenFiles]
  );

  const sortChange = useCallback(
    (innerSortType: DashboardSortType) => {
      setSortAsc(innerSortType !== sortType ? true : !sortAsc);
      setSortType(innerSortType);
      setDisplayedDashboardItems(
        sortDashboardItems(
          displayedDashboardItems,
          innerSortType,
          innerSortType !== sortType ? true : !sortAsc
        )
      );
    },
    [displayedDashboardItems, sortAsc, sortType]
  );

  const searchSharedByMeItems = useCallback(async () => {
    let result: DashboardItem[] | undefined;

    if (folderPath) {
      result = await getFiles({
        path: `${folderBucket}/${folderPath ? folderPath + '/' : ''}`,
        suppressErrors: true,
      });
    } else {
      result = await getSharedByMeFiles();
    }

    if (!result) return;

    return result.map((item) => ({ ...item, isSharedByMe: true }));
  }, [folderBucket, folderPath, getFiles, getSharedByMeFiles]);

  const searchSharedWithMeItems = useCallback(async () => {
    let result: DashboardItem[] | undefined;

    if (folderPath) {
      result = await getFiles({
        path: `${folderBucket}/${folderPath ? folderPath + '/' : ''}`,
        suppressErrors: true,
      });
    } else {
      result = await getSharedWithMeFiles();
    }

    if (!result) return;

    return result;
  }, [folderBucket, folderPath, getFiles, getSharedWithMeFiles]);

  const searchExamplesItems = useCallback(
    async (isRecursive = false) => {
      const result: FilesMetadata[] | undefined = await getFiles({
        path: `${publicBucket}/${folderPath ? folderPath + '/' : ''}`,
        isRecursive,
      });

      return result ?? [];
    },
    [folderPath, getFiles]
  );

  const searchAllItems = useCallback(
    async (isRecursive = false) => {
      const results = await Promise.allSettled([
        getFiles({
          path: `${userBucket}/${folderPath ? folderPath + '/' : ''}`,
          isRecursive,
        }),
        getSharedByMeFiles(),
      ]);

      const result: DashboardItem[] | undefined =
        results[0].status === 'fulfilled' ? results[0].value : undefined;

      const sharedResult =
        results[1].status === 'fulfilled' ? results[1].value : undefined;

      if (!result) {
        navigate(
          getDashboardNavigateUrl({
            tab: 'home',
            folderPath: null,
            folderBucket: null,
          })
        );

        return;
      }

      return result.map((item) => {
        const isPresentedInSharedItems = sharedResult?.some(
          (sharedItem) =>
            sharedItem.parentPath === item.parentPath &&
            sharedItem.name === item.name
        );
        if (isPresentedInSharedItems) {
          return {
            ...item,
            isSharedByMe: true,
          };
        }

        return item;
      });
    },
    [folderPath, getFiles, getSharedByMeFiles, navigate, userBucket]
  );

  const searchRecentItems = useCallback(async (): Promise<DashboardItem[]> => {
    const recentProjects = getRecentProjects();

    if (!recentProjects) return [];

    const items: DashboardItem[] = recentProjects.map(
      (recentProject): DashboardItem => ({
        name: recentProject.projectName + dialProjectFileExtension,
        nodeType: MetadataNodeType.ITEM,
        parentPath: recentProject.projectPath,
        bucket: recentProject.projectBucket,
        updatedAt: recentProject.timestamp,
        resourceType: MetadataResourceType.FILE,
      })
    );

    const itemsMetadata = await Promise.all(
      items.map(async (item) => {
        const metadata = await getResourceMetadata({
          path: constructPath([item.bucket, item.parentPath, item.name]),
          suppressErrors: true,
        });

        if (!metadata) {
          deleteRecentProjectFromRecentProjects(
            item.name.replaceAll(dialProjectFileExtension, ''),
            item.bucket,
            item.parentPath
          );
        }

        return metadata ? item : null;
      })
    );

    return itemsMetadata.filter((item): item is DashboardItem => item !== null);
  }, [getResourceMetadata]);

  const search = useCallback((searchValue: string) => {
    setSearchValue(searchValue);
  }, []);

  const updateDashboardItems = useCallback(
    async (withRefetch?: boolean) => {
      setLoadingDashboard(true);
      let items: DashboardItem[] = [];
      switch (currentTab) {
        case 'home':
          if (searchValue) {
            items =
              allItemsRecursiveRef.current && !withRefetch
                ? allItemsRecursiveRef.current
                : (await searchAllItems(true)) || [];
            allItemsRecursiveRef.current = items;
          } else {
            items = withRefetch
              ? (await searchAllItems()) || []
              : allItemsRef.current;

            allItemsRef.current = items;
            allItemsRecursiveRef.current = null;
          }
          break;
        case 'recent':
          items = withRefetch
            ? (await searchRecentItems()) || []
            : recentItemsRef.current;
          recentItemsRef.current = items;
          break;
        case 'sharedByMe':
          items = withRefetch
            ? (await searchSharedByMeItems()) || []
            : sharedByMeItemsRef.current;
          sharedByMeItemsRef.current = items;
          break;
        case 'sharedWithMe':
          items = withRefetch
            ? (await searchSharedWithMeItems()) || []
            : sharedWithMeItemsRef.current;
          sharedWithMeItemsRef.current = items;
          break;
        case 'examples':
          if (searchValue) {
            items = examplesItemsRecursiveRef.current
              ? examplesItemsRecursiveRef.current
              : (await searchExamplesItems(true)) || [];
            examplesItemsRecursiveRef.current = items;
          } else {
            items = withRefetch
              ? (await searchExamplesItems()) || []
              : examplesItemsRef.current;

            examplesItemsRef.current = items;
            examplesItemsRecursiveRef.current = null;
          }
          break;
        default:
          break;
      }

      const itemsFuse = new Fuse(items, dashboardFuseOptions);
      const resultItems = searchValue
        ? itemsFuse.search(searchValue).map((i) => i.item)
        : items;
      const sortedResultItems = sortDashboardItems(
        resultItems.filter((i) => i.name),
        sortType,
        sortAsc
      );
      const filteredItems = filterDashboardItems(
        sortedResultItems,
        filter
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
    ]
  );

  const refetchData = useCallback(() => {
    updateDashboardItems(true);
  }, [updateDashboardItems]);

  const uploadFiles = useCallback((path: string | null, bucket: string) => {
    setUploadFilePath(path);
    setUploadFileBucket(bucket);
    setUploadFileDisplayed(true);
  }, []);

  const handleUploadFiles = useCallback(
    async (
      parentPath: string | null | undefined,
      bucket: string,
      files: { file: File; name: string; extension: string }[]
    ) => {
      setUploadFileDisplayed(false);

      if (!bucket || !files) return;

      toast.dismiss();

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

        if (result?.file) {
          const toastText = `File '${result.file.name}' uploaded successfully`;

          toast.success(toastText, {});
        } else {
          toast.error(
            `Error happened during uploading "${file.name + file.extension}"`
          );
        }

        return result?.file;
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

          if (!dimResult) {
            toast.error(
              `Error happened during creating schema for file "${result.value.name}". Recheck file structure and reupload it.`
            );

            return;
          }
        }
      });

      toast.dismiss(uploadingToast);

      refetchData();
    },
    [createFile, getDimensionalSchema, refetchData]
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
        createNewFolderModal.current?.({
          path,
          bucket,
        });

        return;
      }

      if (path?.split('/').length === 4) {
        toast.error(`It's not allowed to create more than 4 nested folders`);

        return;
      }

      if (!bucket) return;

      const result = await createFolder({
        bucket,
        path: path,
        name: newFolderName,
      });

      if (!result) return;

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
      folderBucket,
      folderPath,
      refetchData,
      userBucket,
    ]
  );

  useEffect(() => {
    if (userBucket) {
      updateDashboardItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchValue, showHiddenFiles]);

  useEffect(() => {
    if (userBucket) {
      updateDashboardItems(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, folderPath, folderBucket]);

  useEffect(() => {
    if (!userBucket) return;

    const route =
      Object.keys(routeToTabMap).find((route) =>
        location.pathname.startsWith(route)
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
        })
      );

      return;
    }

    if (currentTab !== tab) {
      if (tab === 'recent' || tab === 'home') {
        sortChange('updatedAt');
        setSortAsc(false);
      } else {
        sortChange('name');
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
        refetchData,
        uploadFiles,
        createEmptyFolder,
        selectedItems,
        setSelectedItems,
      }}
    >
      {children}
      <NewDashboardFolder newFolderModal={createNewFolderModal} />

      {uploadFileDisplayed && uploadFileBucket && (
        <PreUploadFile
          initialBucket={uploadFileBucket}
          initialPath={uploadFilePath}
          onCancel={() => setUploadFileDisplayed(false)}
          onOk={handleUploadFiles}
        />
      )}
    </DashboardContext.Provider>
  );
}
