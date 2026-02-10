import { AntdModalBridge } from './AntdModalBridge';
import { ChangeNameModal } from './ChangeNameModal';
import { NewProjectModal } from './NewProject';
import { ShareFilesModal } from './ShareFiles';

export function DashboardModals() {
  return (
    <>
      <AntdModalBridge />
      <ChangeNameModal />
      <NewProjectModal />
      <ShareFilesModal />
    </>
  );
}
