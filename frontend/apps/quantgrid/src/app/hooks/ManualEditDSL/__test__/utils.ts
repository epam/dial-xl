import { WorksheetState } from '@frontend/common';
import { ParsedSheets, SheetReader } from '@frontend/parser';
import { renderHook } from '@testing-library/react';

import { createWrapper } from '../../../testUtils';
import { useManualEditDSL } from '../useManualEditDSL';

export function getWrapper(dsl: string, props: any) {
  const parsedSheets: ParsedSheets = props.parsedSheets ?? {};
  const projectSheets: WorksheetState[] = props.projectSheets ?? [];

  if (props.sheetName && props.projectName) {
    parsedSheets[props.sheetName] = SheetReader.parseSheet(dsl);
    projectSheets.push({
      sheetName: props.sheetName,
      projectName: props.projectName,
      content: dsl,
    });
  }

  return createWrapper({
    ...props,
    sheetContent: dsl,
    parsedSheet: SheetReader.parseSheet(dsl),
    parsedSheets,
    projectSheets,
  });
}

export function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useManualEditDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}
