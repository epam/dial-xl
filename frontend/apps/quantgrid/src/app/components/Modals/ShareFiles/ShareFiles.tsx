import { Checkbox, Input, Modal, Spin } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  CheckIcon,
  CopyIcon,
  dialProjectFileExtension,
  FilesMetadata,
  inputClasses,
  makeCopy,
  modalFooterButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { ShareModalRefFunction } from '../../../common';
import { useShareResources } from '../../../hooks';

type Props = {
  shareProjectModal: { current: ShareModalRefFunction | null };
};

export function ShareFiles({ shareProjectModal }: Props) {
  const { getShareLink } = useShareResources();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [resources, setResources] = useState<
    Omit<FilesMetadata, 'resourceType' | 'url'>[]
  >([]);
  const [fileName, setFileName] = useState('');
  const [fileCount, setFileCount] = useState(0);
  const [descriptionText, setDescriptionText] = useState('');
  const [isWriteShare, setIsWriteShare] = useState(false);
  const [isShareConnectedChats, setIsShareConnectedChats] = useState(false);
  const [isShowShareChatsCheckbox, setIsShowShareChatsCheckbox] =
    useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const generateShareLink = useCallback(async () => {
    setIsLoading(true);

    const link = await getShareLink(resources, {
      permissions: isWriteShare ? ['READ', 'WRITE'] : ['READ'],
      shareConnectedChat: isShareConnectedChats,
    });

    setIsLoading(false);
    if (!link) {
      setIsModalOpen(false);

      return;
    }

    setInputValue(link);
  }, [getShareLink, isShareConnectedChats, isWriteShare, resources]);

  const initModal = useCallback(
    (resources: Omit<FilesMetadata, 'resourceType' | 'url'>[]) => {
      showModal();

      setResources(resources);
      setFileName(resources[0].name);
      setFileCount(resources.length);
      setIsShowShareChatsCheckbox(
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
        const isFolder = file.nodeType === 'FOLDER';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources, isWriteShare, isShareConnectedChats]);

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
            Allow editing by other users
          </Checkbox>
          {isShowShareChatsCheckbox && (
            <Checkbox
              checked={isShareConnectedChats}
              rootClassName="dial-xl-checkbox"
              onChange={(e) => setIsShareConnectedChats(e.target.checked)}
            >
              Allow see project connected conversations
            </Checkbox>
          )}
        </div>
        <div className="flex relative">
          <Input
            className={classNames(inputClasses, 'h-10 pr-8 text-ellipsis')}
            contentEditable={false}
            disabled={isLoading}
            value={inputValue}
          />
          <button
            className="absolute right-2 top-0.5 h-full"
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
                    : 'text-textSecondary hover:text-textAccentPrimary'
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
