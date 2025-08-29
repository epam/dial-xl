import { Dropdown, MenuProps } from 'antd';
import cx from 'classnames';
import classNames from 'classnames';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Icon from '@ant-design/icons';
import { ChevronDown, getDropdownItem } from '@frontend/common';

import { Breadcrumb } from '../../types/breadcrumbs';

interface BreadcrumbTemplateProps {
  isLast: boolean;
  isSingle: boolean;
  breadcrumb: Breadcrumb;
  onSelectBreadcrumb: () => void;
}

const BreadcrumbTemplate = ({
  isLast,
  isSingle,
  breadcrumb,
  onSelectBreadcrumb,
}: BreadcrumbTemplateProps) => {
  return (
    <span
      className={cx(
        'flex gap-1 items-center shrink',
        isLast && 'min-w-[120px] overflow-hidden',
        (!isLast || breadcrumb.dropdownItems) &&
          'hover:text-textPrimary cursor-pointer',
        !isLast ? 'text-textSecondary' : 'text-textPrimary'
      )}
      onClick={() =>
        !isLast && !breadcrumb.dropdownItems && onSelectBreadcrumb()
      }
    >
      {breadcrumb.icon && (
        <Icon className="w-[14px]" component={() => breadcrumb.icon} />
      )}
      <span
        className={classNames(
          'inline-block truncate',
          !isLast && 'max-w-[120px]'
        )}
        title={breadcrumb.name}
      >
        {breadcrumb.dropdownItems ? (
          <Dropdown
            className="flex items-center"
            menu={{ items: breadcrumb.dropdownItems }}
            trigger={['click']}
          >
            <span className="flex gap-1">
              <span>{breadcrumb.name}</span>

              {isSingle && (
                <Icon
                  className="w-[14px] text-textSecondary leading-none"
                  component={() => <ChevronDown />}
                />
              )}
            </span>
          </Dropdown>
        ) : (
          breadcrumb.name
        )}
      </span>
    </span>
  );
};

interface Props {
  classNames?: string;
  breadcrumbs: Breadcrumb[];
  onSelectBreadcrumb: (breadcrumb: Breadcrumb, breadcrumbIndex: number) => void;
}

export const Breadcrumbs = ({
  classNames,
  breadcrumbs,
  onSelectBreadcrumb,
}: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | undefined>();
  const [shouldHideBreadcrumbs, setShouldHideBreadcrumbs] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const dropdownItems: MenuProps['items'] = useMemo(
    () =>
      breadcrumbs
        .slice(1, -1)
        .map((breadcrumb, index) =>
          getDropdownItem({
            key: breadcrumb.name,
            label: breadcrumb.name,
            icon: breadcrumb.icon,
            onClick: () => onSelectBreadcrumb(breadcrumb, index + 1),
          })
        )
        .filter(Boolean) as MenuProps['items'],
    [breadcrumbs, onSelectBreadcrumb]
  );

  const handleRecheckSizes = useCallback(() => {
    const parentWidth = parentRef.current?.offsetWidth ?? 0;
    const currentWidth = ref.current?.scrollWidth ?? 0;

    if (parentWidth === 0 || currentWidth === 0 || !breadcrumbs.length) return;

    if (!initialized) {
      setInitialized(true);
    }

    if (parentWidth < currentWidth) {
      setShouldHideBreadcrumbs(true);
    } else {
      setShouldHideBreadcrumbs(false);
    }
  }, [initialized, breadcrumbs]);

  const setupResizeObserver = useCallback(() => {
    if (resizeObserverRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      handleRecheckSizes();
    });

    const parentElement = parentRef.current;

    if (parentElement) {
      resizeObserver.observe(parentElement);
    }
  }, [handleRecheckSizes]);

  useEffect(() => {
    handleRecheckSizes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breadcrumbs]);

  if (!breadcrumbs.length) return null;

  return (
    <div
      className={cx('shrink-0 overflow-hidden relative', classNames)}
      ref={(el) => {
        parentRef.current = el;
        if (el === null) {
          resizeObserverRef.current?.disconnect();
        } else {
          setupResizeObserver();
        }
      }}
    >
      {/* Element for width calculation */}
      <div
        className="absolute invisible flex gap-1 items-center max-w-[calc(100%-12px)] overflow-hidden"
        ref={ref}
      >
        {breadcrumbs.map((breadcrumb, index) => (
          <Fragment key={breadcrumb.path}>
            <BreadcrumbTemplate
              breadcrumb={breadcrumb}
              isLast={index === breadcrumbs.length - 1}
              isSingle={index === 0 && breadcrumbs.length === 1}
              onSelectBreadcrumb={() => onSelectBreadcrumb(breadcrumb, index)}
            />
            {index !== breadcrumbs.length - 1 && (
              <Icon
                className="w-[14px] text-textSecondary leading-none -rotate-90"
                component={() => <ChevronDown />}
              />
            )}
          </Fragment>
        ))}
      </div>

      {initialized && (
        <div className="flex gap-1 items-center max-w-[calc(100%-12px)]">
          {breadcrumbs.map((breadcrumb, index) => (
            <Fragment key={breadcrumb.path}>
              {shouldHideBreadcrumbs &&
                index !== 0 &&
                index !== breadcrumbs.length - 1 &&
                index === 1 && (
                  <>
                    <Dropdown
                      className="flex items-center"
                      menu={{ items: dropdownItems }}
                      trigger={['click']}
                    >
                      <span className="cursor-pointer text-textSecondary hover:text-textPrimary">
                        ...
                      </span>
                    </Dropdown>
                    <Icon
                      className="w-[14px] text-textSecondary leading-none -rotate-90"
                      component={() => <ChevronDown />}
                    />
                  </>
                )}

              {(!shouldHideBreadcrumbs ||
                index === 0 ||
                index === breadcrumbs.length - 1) && (
                <>
                  <BreadcrumbTemplate
                    breadcrumb={breadcrumb}
                    isLast={index === breadcrumbs.length - 1}
                    isSingle={index === 0 && breadcrumbs.length === 1}
                    onSelectBreadcrumb={() =>
                      onSelectBreadcrumb(breadcrumb, index)
                    }
                  />
                  {index !== breadcrumbs.length - 1 && (
                    <Icon
                      className="w-[14px] text-textSecondary leading-none -rotate-90"
                      component={() => <ChevronDown />}
                    />
                  )}
                </>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
