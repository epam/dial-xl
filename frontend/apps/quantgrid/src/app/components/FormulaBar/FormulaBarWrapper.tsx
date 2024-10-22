import classNames from 'classnames';
import { Fragment } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import {
  FormulaBarDivider,
  FormulaBarExpandButton,
  FormulaBarHeaderSection,
} from './FormulaBarComponents';
import { FormulaBarMenu } from './FormulaBarComponents/FormulaBarMenu';
import { FormulaInput } from './FormulaInput';
import { useFormulaBarWrapper } from './utils';

const headerSectionWidth = 10;
const fullWidth = 100;

export function FormulaBarWrapper() {
  const { fields } = useFormulaBarWrapper();

  return (
    <PanelGroup autoSaveId="formulaBarPanels" direction="horizontal">
      <Panel defaultSize={headerSectionWidth} id="cell" minSize={0} order={1}>
        <FormulaBarHeaderSection />
      </Panel>

      <PanelResizeHandle children={<FormulaBarDivider />} />

      {fields.length !== 0 &&
        fields.map((fieldName, index) => (
          <Fragment key={fieldName}>
            <Panel
              defaultSize={
                calculateWidths(headerSectionWidth, fields.length)[index]
              }
              id={`dimFormula-${index}`}
              minSize={0}
              order={2 + index}
            >
              <FormulaInput fieldName={fieldName} inputIndex={index} />
            </Panel>
            {index < fields.length - 1 && (
              <PanelResizeHandle children={<FormulaBarDivider />} />
            )}
          </Fragment>
        ))}

      {fields.length === 0 && (
        <Panel
          defaultSize={fullWidth - headerSectionWidth}
          id="formula"
          minSize={0}
          order={2}
        >
          <FormulaInput />
        </Panel>
      )}
      <div className={classNames('flex gap-2 px-3 py-1 items-center h-[28px]')}>
        <FormulaBarExpandButton />
        <FormulaBarMenu />
      </div>
    </PanelGroup>
  );
}

function calculateWidths(width: number, count: number): number[] {
  const result: number[] = [];
  let remainingWidth = fullWidth - width;
  const initialWidth = Math.floor(remainingWidth / count);

  for (let i = 0; i < count; i++) {
    result.push(initialWidth);
    remainingWidth -= initialWidth;
  }

  for (let i = 0; i < remainingWidth; i++) {
    result[i % count]++;
  }

  return result;
}
