import { Button, Input, Modal } from 'antd';
import classNames from 'classnames';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ExclamationCircleIcon,
  inputClasses,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  TrashIcon,
} from '@frontend/common';

import { useApiRequests } from '../../../hooks';
import { createUniqueFileName } from '../../../services';
import { isEntityNameInvalid, notAllowedSymbols } from '../../../utils';
import { SelectFolderInput } from '../../SelectFolderInput';

interface ResultedFile {
  file: File;
  name: string;
  extension: string;
}

type Props = {
  initialPath: string | null | undefined;
  initialBucket: string;
  allowedExtensions?: string[];
  initialFiles?: FileList;
  hideFilesSelectionOnOpen?: boolean;
  onOk: (
    parentPath: string | null | undefined,
    parentBucket: string,
    files: ResultedFile[]
  ) => void;
  onCancel: () => void;
};

export function PreUploadFile({
  initialPath,
  initialBucket,
  allowedExtensions,
  initialFiles,
  hideFilesSelectionOnOpen,
  onOk,
  onCancel,
}: Props) {
  const { getFiles } = useApiRequests();

  const selectFilesInputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const [path, setPath] = useState<string | null | undefined>(initialPath);
  const [bucket, setBucket] = useState<string>(initialBucket);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<ResultedFile[]>([]);
  const [storagePathFileNames, setStoragePathFileNames] = useState<string[]>(
    []
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel]);

  const processFiles = useCallback((files: FileList) => {
    const resultedFiles: ResultedFile[] = [];
    for (const file of files) {
      const potentialExtensionStartIndex = file.name.lastIndexOf('.');
      const extensionStartIndex =
        potentialExtensionStartIndex > 0
          ? potentialExtensionStartIndex
          : file.name.length;
      const name = file.name.slice(0, extensionStartIndex);
      const extension = file.name.slice(extensionStartIndex);
      resultedFiles.push({ name: name, file: file, extension });
    }

    return resultedFiles;
  }, []);

  const handleSelectFiles = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;

      if (!input.files) return;

      const files = input.files;

      if (files.length === 0) return;

      const resultedFiles: ResultedFile[] = [...selectedFiles];

      const processedFiles = processFiles(files);

      const existingFileNames = [
        ...storagePathFileNames,
        ...selectedFiles.map((file) => file.name + file.extension),
      ].filter(Boolean);

      for (const processedFile of processedFiles) {
        const fullFileName = processedFile.name + processedFile.extension;
        if (existingFileNames.includes(fullFileName)) {
          processedFile.name = createUniqueFileName(
            processedFile.name,
            existingFileNames.map((name) =>
              name.endsWith(processedFile.extension)
                ? name.slice(0, -processedFile.extension.length)
                : name
            )
          );
          existingFileNames.push(processedFile.name + processedFile.extension);
        } else {
          existingFileNames.push(fullFileName);
        }
      }

      setSelectedFiles(resultedFiles.concat(processedFiles));
    },
    [processFiles, selectedFiles, storagePathFileNames]
  );

  const handleSelectFolder = useCallback(
    (parentPath: string | null | undefined, bucket: string) => {
      setPath(parentPath);
      setBucket(bucket);
    },
    []
  );

  const handleRenameFile = useCallback((newName: string, fileIndex: number) => {
    setSelectedFiles((values) =>
      values.map((value, index) => {
        if (fileIndex === index) {
          return {
            ...value,
            name: newName,
          };
        }

        return value;
      })
    );
  }, []);

  const handleRemoveFile = useCallback((fileIndex: number) => {
    setSelectedFiles((values) =>
      values.filter((_value, index) => index !== fileIndex)
    );
  }, []);

  const validateSelectedFiles = useCallback(() => {
    const processedFileNames: string[] = [];
    const bytesInMb = 1_048_576;
    const invalidNamesFiles: string[] = [];
    const invalidSizesFiles: string[] = [];
    const invalidAlreadyExistedFiles: string[] = [];
    const invalidSameNameFiles: string[] = [];
    const invalidFileExtensionFiles: string[] = [];

    selectedFiles.forEach((file) => {
      const fullFileName = file.name + file.extension;
      if (isEntityNameInvalid(file.name) || file.name.endsWith('.')) {
        invalidNamesFiles.push(fullFileName);
      }

      if (allowedExtensions && !allowedExtensions.includes(file.extension)) {
        invalidFileExtensionFiles.push(fullFileName);
      }

      if (file.file.size > 512 * bytesInMb) {
        invalidSizesFiles.push(fullFileName);
      }

      if (storagePathFileNames.includes(fullFileName)) {
        invalidAlreadyExistedFiles.push(fullFileName);
      }

      if (processedFileNames.includes(fullFileName)) {
        invalidSameNameFiles.push(fullFileName);
      }

      processedFileNames.push(fullFileName);
    });

    let invalidNamesMessage = '';
    let invalidSizesMessage = '';
    let invalidAlreadyExistedMessage = '';
    let invalidSameNamesMessage = '';
    let invalidFileExtensionMessage = '';

    if (invalidNamesFiles.length) {
      invalidNamesMessage = `The symbols ${notAllowedSymbols} and a dot at the end are not allowed in file name. Please rename or delete them from uploading files list: \n- ${invalidNamesFiles.join(
        '\n- '
      )}`;
    }
    if (invalidFileExtensionFiles.length) {
      invalidFileExtensionMessage = `It is only allowed to upload next file extensions: ${allowedExtensions?.join(
        ', '
      )}. Next files couldn't be uploaded:\n- ${invalidFileExtensionFiles.join(
        '\n- '
      )}`;
    }
    if (invalidSizesFiles.length) {
      invalidSizesMessage = `Max file size up to 512 Mb. Next files couldn't be uploaded:\n- ${invalidSizesFiles.join(
        '\n- '
      )}`;
    }
    if (invalidAlreadyExistedFiles.length) {
      invalidAlreadyExistedMessage = `Files which you trying to upload already presented in selected folder. Please rename or delete them from uploading files list:\n- ${invalidAlreadyExistedFiles.join(
        '\n- '
      )}`;
    }
    if (invalidSameNameFiles.length) {
      invalidSameNamesMessage = `It's not allowed to upload files with same names and extensions. Please rename or delete them from uploading files list:\n- ${invalidSameNameFiles.join(
        '\n- '
      )}`;
    }

    return [
      invalidNamesMessage,
      invalidFileExtensionMessage,
      invalidSizesMessage,
      invalidAlreadyExistedMessage,
      invalidSameNamesMessage,
    ].filter(Boolean);
  }, [allowedExtensions, selectedFiles, storagePathFileNames]);

  const handleUploadFiles = useCallback(() => {
    const errors = validateSelectedFiles();
    setErrorMessages(errors);

    if (errors.length) return;

    onOk(path, bucket, selectedFiles);
  }, [bucket, onOk, path, selectedFiles, validateSelectedFiles]);

  const handleGetPathFiles = useCallback(async () => {
    setStoragePathFileNames([]);

    const files =
      (await getFiles({
        path: `${bucket}/${path ? path + '/' : ''}`,
        suppressErrors: true,
      })) ?? [];

    setStoragePathFileNames(files.map((file) => file.name));
  }, [getFiles, path, bucket]);

  useEffect(() => {
    const errors = validateSelectedFiles();
    setErrorMessages(errors);
  }, [validateSelectedFiles]);

  useEffect(() => {
    if (!hideFilesSelectionOnOpen) {
      selectFilesInputRef.current?.click();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialFiles) {
      const files = processFiles(initialFiles);

      setSelectedFiles(files);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleGetPathFiles();
  }, [handleGetPathFiles, path]);

  return (
    <Modal
      cancelButtonProps={{
        className: classNames(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      destroyOnClose={true}
      footer={null}
      open={isOpen}
      title={`Upload files`}
      onCancel={handleClose}
    >
      <div className="flex flex-col gap-3 text-textPrimary">
        <span>
          Max file size is 512 Mb.{' '}
          {allowedExtensions && allowedExtensions.length > 0
            ? `Allowed extensions: ${allowedExtensions.join(', ')}`
            : ''}
        </span>
        {errorMessages.length > 0
          ? errorMessages.map((message) => (
              <div
                className="flex items-center p-3 gap-3 border border-strokeError rounded"
                key={message}
              >
                <Icon
                  className="w-[24px] text-textError shrink-0"
                  component={() => <ExclamationCircleIcon />}
                />
                <div className="text-textError whitespace-pre-wrap">
                  {message}
                </div>
              </div>
            ))
          : null}

        <SelectFolderInput
          bucket={bucket}
          path={path}
          onSelectFolder={handleSelectFolder}
        />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-textSecondary">Files</span>
          <div className="flex flex-col gap-3">
            {selectedFiles.map((file, index) => (
              <div className="flex gap-2 items-center relative" key={file.name}>
                <Input
                  className={classNames('h-10 pr-12', inputClasses)}
                  placeholder="File name"
                  value={file.name}
                  autoFocus
                  onChange={(e) => handleRenameFile(e.target.value, index)}
                />
                <span className="absolute right-12 top-[calc(50%-10px)]">
                  {file.extension}
                </span>
                <button
                  className="flex items-center"
                  onClick={() => handleRemoveFile(index)}
                >
                  <Icon
                    className="w-[24px] text-textSecondary hover:text-textAccentPrimary"
                    component={() => <TrashIcon />}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-textAccentPrimary hover:underline hover:cursor-pointer">
            Add more files...
            <input
              accept={allowedExtensions?.join()}
              className="hidden"
              id="file-upload"
              ref={selectFilesInputRef}
              type="file"
              multiple
              onChange={handleSelectFiles}
              onClick={(e) => {
                (e.target as any).value = null;
              }}
            ></input>
          </label>
          <Button
            className={classNames(
              primaryButtonClasses,
              primaryDisabledButtonClasses,
              'h-10 text-base'
            )}
            disabled={selectedFiles.length === 0}
            onClick={() => handleUploadFiles()}
          >
            Upload files
          </Button>
        </div>
      </div>
    </Modal>
  );
}
