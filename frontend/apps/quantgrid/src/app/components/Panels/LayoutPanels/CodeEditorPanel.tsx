import { Tooltip } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  CodeEditorContext,
  CurlyBracesIcon,
  iconClasses,
  SaveIcon,
  Shortcut,
  shortcutApi,
} from '@frontend/common';

import { PanelProps } from '../../../common';
import { CodeEditorWrapper } from '../../CodeEditorWrapper';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

const changesText = `*${shortcutApi.getLabel(Shortcut.Save)} to save`;

export function CodeEditorPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  const { hasUnsavedChanges, formatDocument } = useContext(CodeEditorContext);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar
        panelName={panelName}
        position={position}
        secondaryTitle={hasUnsavedChanges ? changesText : undefined}
        title={title}
        showExpand
      >
        <Tooltip placement="bottom" title="Format document">
          <Icon
            className={cx(iconClasses, 'w-4')}
            component={() => <CurlyBracesIcon />}
            onClick={formatDocument}
          />
        </Tooltip>
        {hasUnsavedChanges && (
          <Tooltip placement="bottom" title="Save changes">
            <Icon
              className={cx(iconClasses, 'ml-2 w-[16px]')}
              component={() => <SaveIcon />}
            />
          </Tooltip>
        )}
      </PanelToolbar>
      <CodeEditorWrapper />
    </PanelWrapper>
  );
}
