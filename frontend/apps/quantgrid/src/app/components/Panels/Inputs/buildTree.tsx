import Icon from '@ant-design/icons';
import {
  ColumnsIcon,
  CSVFileIcon,
  FilesMetadata,
  FolderIcon,
} from '@frontend/common';

export function getNode(
  inputFile: FilesMetadata,
  fields: string[],
  key: string
) {
  const { name, nodeType } = inputFile;
  const LeafIcon =
    nodeType === 'FOLDER' ? (
      <Icon
        className="text-strokeAccentSecondary w-[18px]"
        component={() => <FolderIcon />}
      />
    ) : (
      <Icon
        className="text-strokeAccentSecondary w-[18px]"
        component={() => <CSVFileIcon />}
      />
    );

  const node = {
    key,
    title: name,
    icon: LeafIcon,
    isLeaf: nodeType === 'FOLDER',
    children: fields.map((fieldName, index) => ({
      key: key + '-' + index,
      title: fieldName,
      isLeaf: true,
      icon: (
        <Icon
          className="stroke-textSecondary"
          component={() => <ColumnsIcon />}
        />
      ),
    })),
  };

  return node;
}
