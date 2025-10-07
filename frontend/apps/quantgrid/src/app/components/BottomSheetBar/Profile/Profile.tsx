import { Popover, Spin } from 'antd';
import cx from 'classnames';
import { useContext, useEffect, useMemo, useState } from 'react';

import { LoadingOutlined } from '@ant-design/icons';
import Icon from '@ant-design/icons';
import {
  CheckIcon,
  ExecutionType,
  Profile as ProfileData,
} from '@frontend/common';

import { ViewportContext } from '../../../context';

type DisplayProfile = {
  type: ExecutionType;
  label: string;
};

export function Profile() {
  const { viewGridData } = useContext(ViewportContext);

  const [displayProfile, setDisplayProfile] = useState<DisplayProfile[]>([]);
  const [calculateIndex, setCalculateIndex] = useState(false);
  const [requests, setRequests] = useState<string[]>([]);
  const [profileMainLabel, setProfileMainLabel] = useState<
    'Complete' | 'Index' | 'Compute'
  >('Complete');

  useEffect(() => {
    const subscription = viewGridData.profileUpdate$.subscribe(
      (profiles: ProfileData[]) => {
        const displayProfile = profiles.map((p) => {
          let label = '';

          if (p.tableKey) {
            label += `${p.tableKey}`;
          } else if (p.fieldKey) {
            label += `${p.fieldKey.table}[${p.fieldKey.field}]`;
          } else if (p.totalKey) {
            label += `Total: ${p.totalKey.table}[${p.totalKey.field}] (${p.totalKey.number})`;
          } else if (p.overrideKey) {
            label += `Override: ${p.overrideKey.table}[${p.overrideKey.field}] (${p.overrideKey.row})`;
          }

          return {
            type: p.type,
            label,
          };
        });

        setDisplayProfile(displayProfile);
        setCalculateIndex(
          displayProfile.some((p) => p.type === ExecutionType.INDEX)
        );
        setRequests(viewGridData.getRequests());
      }
    );

    return () => subscription.unsubscribe();
  }, [viewGridData]);

  const profileContent = useMemo(() => {
    if (!displayProfile.length) return null;

    const indexProfiles = displayProfile.filter(
      (p) => p.type === ExecutionType.INDEX
    );
    const computeProfiles = displayProfile.filter(
      (p) => p.type === ExecutionType.COMPUTE
    );

    if (!indexProfiles.length && !computeProfiles.length) return null;

    return (
      <div className="max-h-[50vh] max-w-[350px] overflow-auto thin-scrollbar flex flex-col gap-2">
        {/* Index section */}
        {indexProfiles.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-text-primary font-semibold text-[13px]">
              Index
            </span>
            {indexProfiles.map((p, i) => (
              <span
                className="text-text-secondary text-[13px]"
                key={`idx-${i}`}
              >
                {p.label}
              </span>
            ))}
          </div>
        )}

        {/* Compute section */}
        {computeProfiles.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-text-primary font-semibold text-[13px]">
              Compute
            </span>
            {computeProfiles.map((p, i) => (
              <span
                className="text-text-secondary text-[13px]"
                key={`cmp-${i}`}
              >
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }, [displayProfile]);

  useEffect(() => {
    // We need to keep latest label if connections still on screen but not profiles and index
    if (requests.length && !displayProfile.length && !calculateIndex) return;

    if (displayProfile.length === 0) {
      setProfileMainLabel('Complete');

      return;
    }
    if (calculateIndex) {
      setProfileMainLabel('Index');

      return;
    }

    setProfileMainLabel('Compute');
  }, [calculateIndex, displayProfile.length, requests.length]);

  const profileTrigger = useMemo(() => {
    return (
      <div className="flex items-center gap-1">
        {profileMainLabel === 'Complete' ? (
          <Icon
            className="text-text-accent-tertiary w-[18px]"
            component={() => <CheckIcon />}
          />
        ) : (
          <Spin
            indicator={
              <LoadingOutlined className="text-text-accent-primary" spin />
            }
            size="small"
          />
        )}
        <span
          className={cx(
            'hidden @[500px]/bottom-bar:inline-block text-[13px] leading-[18px] select-none w-[60px]',
            {
              'font-semibold': calculateIndex,
            }
          )}
        >
          {profileMainLabel}
        </span>
      </div>
    );
  }, [calculateIndex, profileMainLabel]);

  if (!profileContent) {
    return profileTrigger;
  }

  return (
    <Popover
      content={profileContent}
      destroyOnHidden={true}
      trigger={['hover', 'click']}
    >
      {profileTrigger}
    </Popover>
  );
}
