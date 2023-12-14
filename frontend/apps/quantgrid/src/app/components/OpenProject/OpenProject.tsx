import { Button, Modal } from 'antd';
import { useCallback, useContext, useEffect, useState } from 'react';

import { ModalRefFunction } from '../../common';
import { AppContext, ProjectContext } from '../../context';
import { useApi } from '../../hooks';
import { sort } from '../../services';

type Props = {
  openProjectModal: { current: ModalRefFunction | null };
};

export function OpenProject({ openProjectModal }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { openProject, getProjects, closeProject } = useApi();
  const { projects, projectName } = useContext(ProjectContext);
  const { setLoading } = useContext(AppContext);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const onSelectProject = useCallback(
    (project: string) => {
      if (projectName) {
        closeProject(projectName);
      }
      setLoading(true);
      openProject(project);
      setIsModalOpen(false);
    },
    [closeProject, openProject, projectName, setLoading]
  );

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  useEffect(() => {
    openProjectModal.current = showModal;
  }, [showModal, openProjectModal]);

  useEffect(() => {
    if (isModalOpen) {
      getProjects();
    }
  }, [getProjects, isModalOpen]);

  return (
    <Modal
      footer={[
        <Button key="back" onClick={handleCancel}>
          Cancel
        </Button>,
      ]}
      open={isModalOpen}
      title="Open Project"
      onCancel={handleCancel}
    >
      <div className="max-h-[300px] overflow-y-auto">
        {sort(projects, true).map((project) => (
          <div
            className="flex flex-row justify-start py-2 pl-2 cursor-pointer hover:bg-slate-100"
            key={project}
            onClick={() => onSelectProject(project)}
          >
            <span>{project}</span>
          </div>
        ))}
        {projects.length === 0 && <span>No projects found</span>}
      </div>
    </Modal>
  );
}
