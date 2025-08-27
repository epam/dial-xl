import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useContext } from 'react';

import {
  appMessages,
  modalFooterButtonClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { AIHintsContext, InputsContext, ProjectContext } from '../context';
import { deleteProjectHistory } from '../services';
import { displayToast } from '../utils';
import { useApiRequests } from './useApiRequests';

export function useResetProject() {
  const { forkedProject, projectPath, projectName, projectBucket } =
    useContext(ProjectContext);
  const { getHints } = useContext(AIHintsContext);
  const { getInputs } = useContext(InputsContext);
  const { resetProject: resetProjectRequest } = useApiRequests();

  const resetProject = useCallback(() => {
    if (
      projectPath === null ||
      !projectName ||
      !projectBucket ||
      !forkedProject
    )
      return;

    Modal.confirm({
      icon: null,
      title: 'Confirm',
      content:
        'Do you want to reset current project to the base project? All your changes will be lost.',
      okButtonProps: {
        className: cx(modalFooterButtonClasses, primaryButtonClasses),
      },
      cancelButtonProps: {
        className: cx(modalFooterButtonClasses, secondaryButtonClasses),
      },
      onOk: async () => {
        const res = await resetProjectRequest({
          bucket: projectBucket,
          path: projectPath,
          projectName: projectName,
          sourceBucket: forkedProject.bucket,
          sourcePath: forkedProject.path || '',
          sourceName: forkedProject.projectName,
        });

        if (res) {
          deleteProjectHistory(projectName, projectBucket, projectPath);
          getHints();
          getInputs();

          displayToast('success', appMessages.resetProjectSuccess);
        } else {
          displayToast('error', appMessages.resetProjectError);
        }
      },
    });
  }, [
    forkedProject,
    getHints,
    getInputs,
    projectBucket,
    projectName,
    projectPath,
    resetProjectRequest,
  ]);

  return {
    resetProject,
  };
}
