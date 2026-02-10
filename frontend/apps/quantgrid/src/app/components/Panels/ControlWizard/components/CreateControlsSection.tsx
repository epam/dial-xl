import { Form } from 'antd';
import type { DefaultOptionType } from 'rc-select/lib/Select';
import { useMemo } from 'react';

import { AddControlButton } from './AddControlButton';
import { ControlRowForm } from './ControlRowForm';
import { TableOption } from './utils';

type Props = {
  tables: TableOption[];
};

export function CreateControlsSection({ tables }: Props) {
  const fieldsByTable = useMemo(() => {
    const m = new Map<string, DefaultOptionType[]>();
    tables.forEach((t) => m.set(t.value, t.fields));

    return m;
  }, [tables]);

  const tableOptions: DefaultOptionType[] = useMemo(
    () => tables.map(({ value, label }) => ({ value, label })),
    [tables]
  );

  return (
    <Form.List name="controls">
      {(fields, { add, remove }) => (
        <div className="flex flex-col gap-3 px-3 py-2">
          {fields.map(({ key, name, ...restField }) => (
            <ControlRowForm
              fieldKey={key}
              fieldsByTable={fieldsByTable}
              key={key}
              nameIndex={name}
              restField={restField}
              tableOptions={tableOptions}
              onRemove={() => remove(name)}
            />
          ))}

          <AddControlButton add={add} />
        </div>
      )}
    </Form.List>
  );
}
