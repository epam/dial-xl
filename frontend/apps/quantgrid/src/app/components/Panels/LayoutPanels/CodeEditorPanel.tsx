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
  useIsMobile,
} from '@frontend/common';

import { PanelProps } from '../../../common';
import { CodeEditorWrapper } from '../../CodeEditorWrapper';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function CodeEditorPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  const { hasUnsavedChanges, formatDocument } = useContext(CodeEditorContext);
  const isMobile = useIsMobile();
  const changesText = isMobile
    ? '*Unsaved changes'
    : `*${shortcutApi.getLabel(Shortcut.Save)} to save`;

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar
        panelName={panelName}
        position={position}
        secondaryTitle={hasUnsavedChanges ? changesText : undefined}
        title={title}
      >
        <Tooltip placement="bottom" title="Format document" destroyOnHidden>
          <Icon
            className={cx(iconClasses, 'w-4')}
            component={() => <CurlyBracesIcon />}
            onClick={formatDocument}
          />
        </Tooltip>
        {hasUnsavedChanges && (
          <Tooltip placement="bottom" title="Save changes" destroyOnHidden>
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
