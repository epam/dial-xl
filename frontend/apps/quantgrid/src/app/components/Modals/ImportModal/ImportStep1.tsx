import { Button, Input, Spin } from 'antd';
import classNames from 'classnames';
import Fuse, { IFuseOptions } from 'fuse.js';
import { useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ImportDefinition,
  inputClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  SearchIcon,
} from '@frontend/common';

import { getSourceIcon } from '../../../utils';

interface Props {
  selectedDefinition: string | null;
  importDefinitions: ImportDefinition[];
  onSelectDefinition: (definition: string) => void;
  onNextStep: () => void;
}

const fuseOptions: IFuseOptions<any> = {
  includeScore: true,
  shouldSort: true,
  includeMatches: true,
  threshold: 0.2,
  keys: ['name', 'definition'] as (keyof ImportDefinition)[],
};

export const ImportStep1 = ({
  selectedDefinition,
  importDefinitions,
  onSelectDefinition,
  onNextStep,
}: Props) => {
  const [searchValue, setSearchValue] = useState('');
  const [localSelectedDefinition, setLocalSelectedDefinition] =
    useState(selectedDefinition);
  const filteredDefinitions = useMemo(() => {
    const itemsFuse = new Fuse(importDefinitions, fuseOptions);

    return searchValue
      ? itemsFuse.search(searchValue).map((i) => i.item)
      : importDefinitions;
  }, [importDefinitions, searchValue]);

  if (!importDefinitions) return <Spin />;

  return (
    <div className="flex flex-col gap-3 grow justify-between text-text-primary h-[340px]">
      <div className="w-full">
        <Input
          className={inputClasses}
          placeholder="Search source..."
          prefix={
            <div className="size-[18px] text-text-secondary shrink-0">
              <SearchIcon />
            </div>
          }
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <div className="grow grid grid-cols-3 content-start gap-3 w-full overflow-y-auto thin-scrollbar">
        {filteredDefinitions.map((item) => (
          <div
            className={classNames(
              'flex items-center gap-2 border p-3 cursor-pointer rounded h-14 shrink-0 grow-0',
              {
                'border-stroke-accent-primary bg-bg-accent-primary-alpha':
                  localSelectedDefinition === item.definition,
                'border-stroke-primary hover:border-stroke-hover-focus':
                  localSelectedDefinition !== item.definition,
              },
            )}
            key={item.definition}
            onClick={() => setLocalSelectedDefinition(item.definition)}
          >
            <div className="size-10 rounded-full bg-bg-layer-2 p-2 shrink-0">
              <Icon
                className="w-6 text-text-primary"
                component={() => getSourceIcon(item.definition)}
              />
            </div>
            <span className="text-text-primary text-[13px]">{item.name}</span>
          </div>
        ))}
      </div>

      <div className="flex w-full flex-col gap-4">
        <hr className="border-stroke-tertiary w-[calc(100%+48px)] -ml-6" />
        <div className="flex justify-end">
          <Button
            className={classNames(
              primaryButtonClasses,
              primaryDisabledButtonClasses,
            )}
            disabled={!localSelectedDefinition}
            onClick={() => {
              onSelectDefinition(localSelectedDefinition!);
              onNextStep();
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
