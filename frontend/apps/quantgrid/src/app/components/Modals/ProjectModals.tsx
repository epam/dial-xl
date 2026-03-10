import { AntdModalBridge } from './AntdModalBridge';
import { ChangeNameModal } from './ChangeNameModal';
import { DeleteModal } from './DeleteModal';
import { ExcelPreviewModal } from './ExcelPreviewModal';
import { ImportModal } from './ImportModal';
import { NewProjectModal } from './NewProject';
import { SearchModal } from './SearchModal';
import { ShareFilesModal } from './ShareFiles';
import { ShortcutsHelpModal } from './ShortcutsHelp';
import { StatusModal } from './StatusModal';
import { SyncImportsConfirmModal } from './SyncImportsConfirmModal';

export function ProjectModals() {
  return (
    <>
      <AntdModalBridge />
      <ChangeNameModal />
      <SearchModal />
      <DeleteModal />
      <ImportModal />
      <StatusModal />
      <NewProjectModal />
      <ShareFilesModal />
      <ShortcutsHelpModal />
      <SyncImportsConfirmModal />
      <ExcelPreviewModal />
    </>
  );
}
