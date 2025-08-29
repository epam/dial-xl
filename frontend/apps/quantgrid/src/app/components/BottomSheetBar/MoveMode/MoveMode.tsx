import { Segmented, Tooltip } from 'antd';
import cx from 'classnames';
import { useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  CursorIcon,
  HandIcon,
  Shortcut,
  shortcutApi,
  ViewportInteractionMode,
} from '@frontend/common';

import { AppContext } from '../../../context';

export function MoveMode() {
  const { setViewportInteractionMode, viewportInteractionMode } =
    useContext(AppContext);

  const handleChange = useCallback(
    (mode: ViewportInteractionMode) => {
      if (viewportInteractionMode === mode) return;

      setViewportInteractionMode(mode);
    },
    [setViewportInteractionMode, viewportInteractionMode]
  );

  return (
    <Segmented
      options={[
        {
          value: 'select',
          icon: (
            <Tooltip
              placement="top"
              title={`Enable Select Mode (${shortcutApi.getLabel(
                Shortcut.ChangeViewportInteractionMode
              )})`}
            >
              <Icon
                className={cx(
                  ' w-[16px]',
                  viewportInteractionMode === 'select'
                    ? 'text-textAccentPrimary'
                    : 'text-textSecondary'
                )}
                component={() => <CursorIcon />}
              />
            </Tooltip>
          ),
        },
        {
          value: 'pan',
          icon: (
            <Tooltip
              placement="top"
              title={`Enable Pan Mode (${shortcutApi.getLabel(
                Shortcut.ChangeViewportInteractionMode
              )})`}
            >
              <Icon
                className={cx(
                  ' w-[16px]',
                  viewportInteractionMode === 'pan'
                    ? 'text-textAccentPrimary'
                    : 'text-textSecondary'
                )}
                component={() => <HandIcon />}
              />
            </Tooltip>
          ),
        },
      ]}
      shape="round"
      size="small"
      value={viewportInteractionMode === 'select' ? 'select' : 'pan'}
      onChange={handleChange}
    />
  );
}
