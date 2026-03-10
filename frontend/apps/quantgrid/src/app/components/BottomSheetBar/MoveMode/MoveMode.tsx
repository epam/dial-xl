import { Segmented, Tooltip } from 'antd';
import cx from 'classnames';
import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import Icon from '@ant-design/icons';
import {
  CursorIcon,
  HandIcon,
  Shortcut,
  shortcutApi,
  ViewportInteractionMode,
} from '@frontend/common';

import { useViewStore } from '../../../store';

export function MoveMode() {
  const { setViewportInteractionMode, viewportInteractionMode } = useViewStore(
    useShallow((s) => ({
      setViewportInteractionMode: s.setViewportInteractionMode,
      viewportInteractionMode: s.viewportInteractionMode,
    })),
  );

  const handleChange = useCallback(
    (mode: ViewportInteractionMode) => {
      if (viewportInteractionMode === mode) return;

      setViewportInteractionMode(mode);
    },
    [setViewportInteractionMode, viewportInteractionMode],
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
                Shortcut.ChangeViewportInteractionMode,
              )})`}
              destroyOnHidden
            >
              <Icon
                className={cx(
                  ' w-[16px]',
                  viewportInteractionMode === 'select'
                    ? 'text-text-accent-primary'
                    : 'text-text-secondary',
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
                Shortcut.ChangeViewportInteractionMode,
              )})`}
              destroyOnHidden
            >
              <Icon
                className={cx(
                  ' w-[16px]',
                  viewportInteractionMode === 'pan'
                    ? 'text-text-accent-primary'
                    : 'text-text-secondary',
                )}
                component={() => <HandIcon />}
              />
            </Tooltip>
          ),
        },
      ]}
      rootClassName="hidden md:block"
      shape="round"
      size="small"
      value={viewportInteractionMode === 'select' ? 'select' : 'pan'}
      onChange={handleChange}
    />
  );
}
