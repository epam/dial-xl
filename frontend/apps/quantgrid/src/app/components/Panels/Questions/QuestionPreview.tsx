import { Collapse, Input } from 'antd';

import { inputClasses, Question } from '@frontend/common/lib';

interface Props {
  question: Question;
}

export const QuestionPreview = ({ question }: Props) => {
  return (
    <div className="flex flex-col gap-3 grow overflow-x-hidden">
      <label className="text-text-primary">
        Name
        <Input
          className={inputClasses}
          value={question.name}
          readOnly
          required
        />
      </label>

      <Collapse
        className="w-full"
        items={[
          {
            key: '1',
            label: 'Data',
            children: (
              <div className="w-full whitespace-pre bg-bg-layer-2 p-1 text-text-primary overflow-x-auto thin-scrollbar">
                {JSON.stringify(question, null, 2)}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
