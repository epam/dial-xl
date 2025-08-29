import Icon from '@ant-design/icons';
import {
  ColumnsIcon,
  CSVFileIcon,
  FilesMetadata,
  FolderIcon,
  MetadataNodeType,
} from '@frontend/common';

export function getNode(
  inputFile: FilesMetadata,
  fields: string[],
  key: string
) {
  const { name, nodeType } = inputFile;
  const LeafIcon =
    nodeType === MetadataNodeType.FOLDER ? (
      <Icon
        className="text-strokeAccentSecondary w-[18px]"
        component={() => <FolderIcon />}
      />
    ) : (
      <Icon
        className="text-strokeAccentSecondary w-[18px]"
        component={() => <CSVFileIcon />}
        id={`dragged-image-${key}`}
      />
    );

  const node = {
    key,
    title: name,
    icon: LeafIcon,
    isLeaf: nodeType === MetadataNodeType.FOLDER,
    children: fields.map((fieldName, index) => ({
      key: key + '-' + index,
      title: fieldName,
      isLeaf: true,
      icon: (
        <Icon
          className="size-[18px] text-textSecondary"
          component={() => <ColumnsIcon />}
        />
      ),
    })),
  };

  return node;
}
