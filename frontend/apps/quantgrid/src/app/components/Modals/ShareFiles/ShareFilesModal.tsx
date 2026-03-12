import { Avatar, Button, Checkbox, Input, Modal, Spin } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';

import Icon from '@ant-design/icons';
import {
  appMessages,
  CheckIcon,
  conversationsEndpointType,
  CopyIcon,
  dialProjectFileExtension,
  filesEndpointType,
  inputClasses,
  makeCopy,
  MetadataNodeType,
  MetadataResourceType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  publicBucket,
  ResourceMetadata,
  ResourcePermission,
  secondaryButtonClasses,
  stableColorFromLabel,
} from '@frontend/common';

import { ResourceReference } from '../../../common';
import { ApiContext, ProjectContext } from '../../../context';
import {
  useApiRequests,
  useProjectActions,
  useShareResources,
} from '../../../hooks';
import { useShareFilesModalStore } from '../../../store';
import {
  constructPath,
  convertUrlToMetadata,
  decodeApiUrl,
  displayToast,
  encodeApiUrl,
  getProjectNavigateUrl,
  normalizePermissionsLabels,
} from '../../../utils';

export function ShareFilesModal() {
  const { getResourceMetadata, getSharedByMeResources } = useApiRequests();
  const { getShareLink, collectResourceAndDependentFileUrls } =
    useShareResources();
  const { userBucket } = useContext(ApiContext);
  const {
    projectPermissions,
    indexErrors,
    compilationErrors,
    sheetErrors,
    runtimeErrors,
  } = useContext(ProjectContext);
  const { user } = useAuth();
  const { cloneCurrentProjectAction } = useProjectActions();

  const isOpen = useShareFilesModalStore((s) => s.isOpen);
  const close = useShareFilesModalStore((s) => s.close);
  const resources = useShareFilesModalStore((s) => s.resources);

  const [fileName, setFileName] = useState('');
  const [fileCount, setFileCount] = useState(0);
  const [descriptionText, setDescriptionText] = useState('');
  const [isWriteShare, setIsWriteShare] = useState(false);
  const [isShareConnectedChats, setIsShareConnectedChats] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublicShare, setIsPublicShare] = useState(false);
  const [isAllowResharing, setIsAllowResharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShowErrorCloneButton, setIsShowErrorCloneButton] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<
    { name: string; permissions: string[]; isAuthor?: boolean }[] | null
  >([]);

  const getSharedUsers = useCallback(
    async (resources: ResourceReference[]) => {
      // Display only for single file
      if (resources.length > 1 || resources.length === 0) {
        setSharedUsers(null);

        return;
      }

      const resource = resources[0];
      const sharedUsers: {
        name: string;
        permissions: string[];
        isAuthor?: boolean;
      }[] = [];

      // Temporarily show shared users only for user projects
      if (resource.bucket === publicBucket || resource.bucket !== userBucket) {
        setSharedUsers(null);

        return;
      }

      sharedUsers.push({
        name: user?.profile.name ? user?.profile.name + ' (Me)' : 'Me',
        permissions: normalizePermissionsLabels(projectPermissions || []),
        isAuthor: true,
      });
      const sharedByMeResources = await getSharedByMeResources({
        resourceType: MetadataResourceType.FILE,
      });
      const resourceUrl = encodeApiUrl(
        constructPath([
          filesEndpointType,
          resource.bucket,
          resource.parentPath,
          resource.name,
        ]),
      );

      const sharedByMeResourcesData = sharedByMeResources.success
        ? sharedByMeResources.data
        : [];
      const sharedMatchedResourcesFile = sharedByMeResourcesData.find(
        (item) =>
          item.nodeType === MetadataNodeType.ITEM && item.url === resourceUrl,
      );
      const sharedMatchedResourceFolders = sharedByMeResourcesData
        ?.filter(
          (item) =>
            item.nodeType === MetadataNodeType.FOLDER &&
            resourceUrl.startsWith(item.url),
        )
        .sort((a, b) => a.url.length - b.url.length);

      const sharedMatchedResource =
        sharedMatchedResourcesFile ??
        (sharedMatchedResourceFolders
          ? sharedMatchedResourceFolders[
              sharedMatchedResourceFolders.length - 1
            ]
          : undefined);

      if (!sharedMatchedResource) {
        setSharedUsers(sharedUsers);

        return;
      }

      sharedUsers.push(
        ...sharedMatchedResource.sharedWith.map((item) => ({
          name: item.user,
          permissions: normalizePermissionsLabels(item.permissions),
        })),
      );

      setSharedUsers(sharedUsers);
    },
    [
      getSharedByMeResources,
      projectPermissions,
      user?.profile.name,
      userBucket,
    ],
  );

  const processResources = useCallback(
    async (initialResources: ResourceReference[]) => {
      if (initialResources.length === 0) return;

      const resourcesUrls = await collectResourceAndDependentFileUrls(
        initialResources,
        false,
        isShareConnectedChats,
      );

      if (!resourcesUrls?.length) {
        displayToast('error', appMessages.shareLinkCreateError);

        return;
      }

      const mappedResources = resourcesUrls
        .map(convertUrlToMetadata)
        .filter(Boolean) as ResourceMetadata[];
      const notUserResources = mappedResources.filter(
        (res) => res.bucket !== userBucket,
      );
      if (notUserResources.length && isWriteShare) {
        setErrorMessage(
          `It's not allowed to share resources with "WRITE" permissions which is not yours. You can clone the project and share it with "WRITE" permissions`,
        );
        setIsShowErrorCloneButton(true);

        return [];
      }

      const resultingUrlsMetadata = await Promise.allSettled(
        mappedResources.map((res) => {
          const path = res.url.startsWith(`${filesEndpointType}/`)
            ? res.url.replace(`${filesEndpointType}/`, '')
            : res.url.startsWith(`${conversationsEndpointType}/`)
              ? res.url.replace(`${conversationsEndpointType}/`, '')
              : res.url;

          return getResourceMetadata({
            path: decodeApiUrl(path),
            withPermissions: true,
            suppressErrors: true,
            resourceType: res.url.startsWith(`${conversationsEndpointType}/`)
              ? MetadataResourceType.CONVERSATION
              : MetadataResourceType.FILE,
          });
        }),
      );

      const mappedResourcesResults = mappedResources.map((resource, index) => ({
        resource,
        result: resultingUrlsMetadata[index],
      }));
      const unshareableResources = mappedResourcesResults.filter(
        ({ result }) =>
          result.status === 'fulfilled' &&
          result.value.success &&
          !result.value.data.permissions?.includes('SHARE'),
      );
      if (unshareableResources.length) {
        setErrorMessage(appMessages.shareNotAllowedError);
        setIsShowErrorCloneButton(true);

        return [];
      }

      const failedResources = mappedResourcesResults
        // skip error when there are no conversations
        .filter(
          ({ resource, result }) =>
            !(
              result.status === 'fulfilled' &&
              result.value.success &&
              resource.nodeType === 'FOLDER' &&
              resource.resourceType === 'CONVERSATION'
            ),
        )
        .filter(
          ({ result }) =>
            result.status === 'rejected' ||
            (result.status === 'fulfilled' && !result.value.success),
        );
      if (failedResources.length) {
        setErrorMessage(
          'Warning: Cannot share some of the referenced files. They are either deleted or inaccessible.',
        );
      }

      return mappedResourcesResults.reduce<string[]>((acc, item) => {
        if (item.result.status === 'fulfilled' && item.result.value.success) {
          acc.push(item.result.value.data.url);
        }

        return acc;
      }, []);
    },
    [
      collectResourceAndDependentFileUrls,
      getResourceMetadata,
      isShareConnectedChats,
      isWriteShare,
      userBucket,
    ],
  );

  const generateShareLink = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setIsShowErrorCloneButton(false);

    getSharedUsers(resources);

    // Special case: for public projects just share the link to project
    if (
      resources.length === 1 &&
      resources[0].bucket === publicBucket &&
      resources[0].name.endsWith(dialProjectFileExtension) &&
      resources[0].nodeType === MetadataNodeType.ITEM
    ) {
      setIsPublicShare(true);
      setInputValue(
        window.origin +
          getProjectNavigateUrl({
            projectBucket: resources[0].bucket,
            projectName: resources[0].name.replaceAll(
              dialProjectFileExtension,
              '',
            ),
            projectPath: resources[0].parentPath,
          }),
      );
      setIsLoading(false);

      return;
    }

    // Show project contains errors when in project context
    if (
      indexErrors?.length ||
      compilationErrors?.length ||
      sheetErrors?.length ||
      runtimeErrors?.length
    ) {
      setErrorMessage(`The project you want to share contains errors.`);
    }

    const resourcesUrls = await processResources(resources);

    if (!resourcesUrls) {
      setIsLoading(false);
      close();

      return;
    }

    if (!resourcesUrls.length) {
      setIsLoading(false);
      setInputValue('');

      return;
    }

    const permissions: ResourcePermission[] = ['READ'];
    if (isWriteShare) {
      permissions.push('WRITE');
    }
    if (isAllowResharing) {
      permissions.push('SHARE');
    }
    const link = await getShareLink(resourcesUrls, {
      permissions,
      shareConnectedChat: isShareConnectedChats,
    });

    setIsLoading(false);
    if (!link) {
      close();

      return;
    }

    setInputValue(link);
  }, [
    getSharedUsers,
    resources,
    indexErrors?.length,
    compilationErrors?.length,
    sheetErrors?.length,
    runtimeErrors?.length,
    processResources,
    isWriteShare,
    isAllowResharing,
    getShareLink,
    isShareConnectedChats,
    close,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    setIsWriteShare(false);
    setIsAllowResharing(false);
    setIsPublicShare(false);
    setFileName(resources[0].name);
    setFileCount(resources.length);
    setIsShareConnectedChats(
      resources.some((resource) =>
        resource.name.endsWith(dialProjectFileExtension),
      ),
    );

    if (fileCount > 1) {
      setDescriptionText(
        'These resources and their updates will be visible to users with the link.',
      );
    } else {
      const file = resources[0];
      const isProject = file.name.endsWith(dialProjectFileExtension);
      const isFolder = file.nodeType === MetadataNodeType.FOLDER;

      const label = isFolder ? 'folder' : isProject ? 'project' : 'file';

      setDescriptionText(
        `This ${label} and its updates will be visible to users with the link.`,
      );
    }
  }, [fileCount, isOpen, resources]);

  const handleCopy = useCallback(() => {
    makeCopy(inputValue);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 3000);
  }, [inputValue]);

  useEffect(() => {
    if (!isOpen) return;

    generateShareLink();
  }, [generateShareLink, isOpen]);

  return (
    <Modal
      cancelButtonProps={{
        className: classNames(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      destroyOnHidden={true}
      footer={null}
      open={isOpen}
      title={`Share: ${
        fileCount > 1
          ? `${fileCount} files`
          : fileName.replaceAll(dialProjectFileExtension, '')
      }`}
      onCancel={close}
    >
      <div className="flex flex-col gap-4">
        {errorMessage && (
          <div className="rounded border border-stroke-error p-5 flex flex-col gap-2">
            <span className="text-text-error whitespace-pre-wrap">
              {errorMessage}
            </span>

            {isShowErrorCloneButton && (
              <Button
                className={classNames(
                  primaryButtonClasses,
                  primaryDisabledButtonClasses,
                  'h-10 text-base',
                )}
                onClick={() => cloneCurrentProjectAction()}
              >
                Clone project
              </Button>
            )}
          </div>
        )}

        {isPublicShare ? (
          <div className="flex flex-col gap-2">
            <div className="text-text-secondary">{descriptionText}</div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="text-text-secondary">
                The link is temporary and expires in 3 days.
              </div>
              <div className="text-text-secondary">
                {descriptionText} Renaming will stop sharing.
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Checkbox
                checked={isWriteShare}
                rootClassName="dial-xl-checkbox"
                onChange={(e) => setIsWriteShare(e.target.checked)}
              >
                Allow <span className="font-semibold">edit</span> by other users
              </Checkbox>
              <Checkbox
                checked={isAllowResharing}
                rootClassName="dial-xl-checkbox"
                onChange={(e) => setIsAllowResharing(e.target.checked)}
              >
                Allow <span className="font-semibold">reshare</span> by other
                users
              </Checkbox>
            </div>
          </>
        )}
        <div className="flex relative items-center">
          <Input
            className={classNames(inputClasses, 'h-10 pr-10 text-ellipsis')}
            contentEditable={false}
            disabled={isLoading || !inputValue}
            placeholder="Share link"
            value={inputValue}
          />
          <button
            className="group absolute right-2 top-0.5 h-full cursor-pointer disabled:cursor-not-allowed disabled:text-controls-text-disable"
            disabled={isLoading || !inputValue}
            onClick={handleCopy}
          >
            {isLoading ? (
              <Spin className="size-6" />
            ) : (
              <Icon
                className={classNames(
                  'w-6',
                  isCopied
                    ? 'text-text-accent-primary'
                    : 'group-enabled:text-text-secondary group-hover:group-enabled:text-text-accent-primary',
                )}
                component={() => (isCopied ? <CheckIcon /> : <CopyIcon />)}
              ></Icon>
            )}
          </button>
        </div>

        {sharedUsers && (
          <>
            <hr className="w-[calc(100%+160px] -ml-6 -mr-6"></hr>
            <div className="flex flex-col gap-2">
              <span className="font-bold">Who has access</span>
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto thin-scrollbar">
                {sharedUsers.map((user) => (
                  <span
                    className="flex justify-between gap-2 items-center"
                    key={user.name}
                  >
                    <span className="flex items-center gap-2">
                      <Avatar
                        className="text-xs!"
                        size={28}
                        style={{
                          backgroundColor: stableColorFromLabel(user.name),
                        }}
                      >
                        {user.name.slice(0, 1)}
                      </Avatar>
                      {user.name}
                    </span>
                    <span
                      className={classNames(
                        'shrink-0 flex items-center gap-1',
                        // user.isAuthor && 'font-bold'
                      )}
                    >
                      {user.isAuthor ? 'Author' : user.permissions.join(', ')}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
