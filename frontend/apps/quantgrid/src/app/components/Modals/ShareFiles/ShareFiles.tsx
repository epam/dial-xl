import { Button, Checkbox, Input, Modal, Spin } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  appMessages,
  CheckIcon,
  conversationsEndpointType,
  CopyIcon,
  dialProjectFileExtension,
  filesEndpointType,
  FilesMetadata,
  inputClasses,
  makeCopy,
  MetadataNodeType,
  MetadataResourceType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  publicBucket,
  ResourcePermission,
  secondaryButtonClasses,
} from '@frontend/common';

import { ShareModalRefFunction } from '../../../common';
import { ApiContext, ProjectContext } from '../../../context';
import { useApiRequests, useShareResources } from '../../../hooks';
import {
  convertUrlToMetadata,
  displayToast,
  getProjectNavigateUrl,
} from '../../../utils';

type Props = {
  shareProjectModal: { current: ShareModalRefFunction | null };
};

export function ShareFiles({ shareProjectModal }: Props) {
  const { getResourceMetadata } = useApiRequests();
  const { getShareLink, collectResourceAndDependentFileUrls } =
    useShareResources();
  const { userBucket } = useContext(ApiContext);
  const { cloneCurrentProject } = useContext(ProjectContext);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [resources, setResources] = useState<
    Omit<FilesMetadata, 'resourceType' | 'url'>[]
  >([]);
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

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const processResources = useCallback(
    async (initialResources: Omit<FilesMetadata, 'resourceType' | 'url'>[]) => {
      if (initialResources.length === 0) return;

      const resourcesUrls = await collectResourceAndDependentFileUrls(
        initialResources,
        false,
        isShareConnectedChats
      );

      if (!resourcesUrls?.length) {
        displayToast('error', appMessages.shareLinkCreateError);

        return;
      }

      const mappedResources = resourcesUrls
        .map(convertUrlToMetadata)
        .filter(Boolean) as FilesMetadata[];
      const notUserResources = mappedResources.filter(
        (res) => res.bucket !== userBucket
      );
      if (notUserResources.length && isWriteShare) {
        setErrorMessage(
          `It's not allowed to share resources with "WRITE" permissions which is not yours. You can clone the project and share it with "WRITE" permissions`
        );
        setIsShowErrorCloneButton(true);

        return [];
      }

      const resultingUrlsMetadata = await Promise.allSettled(
        mappedResources.map((res) =>
          getResourceMetadata({
            path: res.url.startsWith(`${filesEndpointType}/`)
              ? res.url.replace(`${filesEndpointType}/`, '')
              : res.url.startsWith(`${conversationsEndpointType}/`)
              ? res.url.replace(`${conversationsEndpointType}/`, '')
              : res.url,
            withPermissions: true,
            suppressErrors: true,
            resourceType: res.url.startsWith(`${conversationsEndpointType}/`)
              ? MetadataResourceType.CONVERSATION
              : undefined,
          })
        )
      );

      const mappedResourcesResults = mappedResources.map((resource, index) => ({
        resource,
        result: resultingUrlsMetadata[index],
      }));
      const unshareableResources = mappedResourcesResults.filter(
        ({ result }) =>
          result.status === 'fulfilled' &&
          result.value &&
          !result.value.permissions?.includes('SHARE')
      );
      if (unshareableResources.length) {
        setErrorMessage(appMessages.shareNotAllowedError);
        setIsShowErrorCloneButton(true);

        return [];
      }

      const failedResources = mappedResourcesResults.filter(
        ({ result }) => result.status === 'rejected' || !result.value
      );
      if (failedResources.length) {
        setErrorMessage(
          'Warning: Cannot share some of the referenced files. They are either deleted or inaccessible.'
        );
      }

      return mappedResourcesResults
        .filter(
          (item) => item.result.status === 'fulfilled' && item.result.value
        )
        .map(
          (item) =>
            (item.result as PromiseFulfilledResult<FilesMetadata>).value.url
        );
    },
    [
      collectResourceAndDependentFileUrls,
      getResourceMetadata,
      isShareConnectedChats,
      isWriteShare,
      userBucket,
    ]
  );

  const generateShareLink = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setIsShowErrorCloneButton(false);

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
              ''
            ),
            projectPath: resources[0].parentPath,
          })
      );
      setIsLoading(false);

      return;
    }

    const resourcesUrls = await processResources(resources);

    if (!resourcesUrls) {
      setIsLoading(false);
      setIsModalOpen(false);

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
      setIsModalOpen(false);

      return;
    }

    setInputValue(link);
  }, [
    getShareLink,
    isAllowResharing,
    isShareConnectedChats,
    isWriteShare,
    processResources,
    resources,
  ]);

  const initModal = useCallback(
    (resources: Omit<FilesMetadata, 'resourceType' | 'url'>[]) => {
      showModal();

      setIsWriteShare(false);
      setIsAllowResharing(false);
      setIsPublicShare(false);
      setResources(resources);
      setFileName(resources[0].name);
      setFileCount(resources.length);
      setIsShareConnectedChats(
        resources.some((resource) =>
          resource.name.endsWith(dialProjectFileExtension)
        )
      );

      if (fileCount > 1) {
        setDescriptionText(
          'These resources and their updates will be visible to users with the link.'
        );
      } else {
        const file = resources[0];
        const isProject = file.name.endsWith(dialProjectFileExtension);
        const isFolder = file.nodeType === MetadataNodeType.FOLDER;

        const label = isFolder ? 'folder' : isProject ? 'project' : 'file';

        setDescriptionText(
          `This ${label} and its updates will be visible to users with the link.`
        );
      }
    },
    [fileCount, showModal]
  );

  const handleCopy = useCallback(() => {
    makeCopy(inputValue);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 3000);
  }, [inputValue]);

  useEffect(() => {
    shareProjectModal.current = initModal;
  }, [initModal, shareProjectModal]);

  useEffect(() => {
    if (!isModalOpen) return;

    generateShareLink();
  }, [generateShareLink, isModalOpen]);

  return (
    <Modal
      cancelButtonProps={{
        className: classNames(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      destroyOnClose={true}
      footer={null}
      open={isModalOpen}
      title={`Share: ${
        fileCount > 1
          ? `${fileCount} files`
          : fileName.replaceAll(dialProjectFileExtension, '')
      }`}
      onCancel={handleClose}
    >
      <div className="flex flex-col gap-4">
        {errorMessage && (
          <div className="rounded border border-strokeError p-5 flex flex-col gap-2">
            <span className="text-textError whitespace-pre-wrap">
              {errorMessage}
            </span>

            {isShowErrorCloneButton && (
              <Button
                className={classNames(
                  primaryButtonClasses,
                  primaryDisabledButtonClasses,
                  'h-10 text-base'
                )}
                onClick={() => cloneCurrentProject()}
              >
                Clone project
              </Button>
            )}
          </div>
        )}

        {isPublicShare ? (
          <div className="flex flex-col gap-2">
            <div className="text-textSecondary">
              The link is temporary and expires in 3 days.
            </div>
            <div className="text-textSecondary">{descriptionText}</div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="text-textSecondary">
                The link is temporary and expires in 3 days.
              </div>
              <div className="text-textSecondary">
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
                Allow <span className="font-semibold">share</span> by other
                users
              </Checkbox>
            </div>
          </>
        )}
        <div className="flex relative">
          <Input
            className={classNames(inputClasses, 'h-10 pr-8 text-ellipsis')}
            contentEditable={false}
            disabled={isLoading || !inputValue}
            placeholder="Share link"
            value={inputValue}
          />
          <button
            className="group absolute right-2 top-0.5 h-full disabled:cursor-not-allowed disabled:text-controlsTextDisable"
            disabled={isLoading || !inputValue}
            onClick={handleCopy}
          >
            {isLoading ? (
              <Spin />
            ) : (
              <Icon
                className={classNames(
                  'w-6',
                  isCopied
                    ? 'text-textAccentPrimary'
                    : 'group-enabled:text-textSecondary group-enabled:group-hover:text-textAccentPrimary'
                )}
                component={() => (isCopied ? <CheckIcon /> : <CopyIcon />)}
              ></Icon>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
