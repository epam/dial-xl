import { DefaultOptionType } from 'rc-select/lib/Select';
import Select, { SingleValue } from 'react-select';

import { SelectClasses, selectStyles } from '@frontend/common';

interface Props {
  selectedAggregation: DefaultOptionType | undefined;
  aggregationOptions: { value: string; label: string }[];
  onAggregationChange: (option: SingleValue<DefaultOptionType>) => void;
}

export const AggregationSelector = ({
  selectedAggregation,
  aggregationOptions,
  onAggregationChange,
}: Props) => {
  return (
    <div className="my-3">
      <label className="block text-[12px] text-text-secondary mb-1">
        Aggregation Function:
      </label>
      <Select
        classNames={SelectClasses}
        components={{
          IndicatorSeparator: null,
        }}
        isSearchable={false}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        name="aggregationFunctionSelect"
        options={aggregationOptions}
        styles={selectStyles}
        value={selectedAggregation || null}
        onChange={onAggregationChange}
      />
    </div>
  );
};
