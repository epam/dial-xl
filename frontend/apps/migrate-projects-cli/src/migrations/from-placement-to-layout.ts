import yaml from 'yaml';

export function fromPlacementToLayoutDecorator(content: string) {
  const data: Record<string, string> = yaml.parse(content);

  for (const sheetName in data) {
    const sheetContent = data[sheetName];

    const splittedContentItems = sheetContent.split(/(\btable\b)/);
    const placementRegexp =
      /(\s*|^)!placement\([\s]*(\d+)[\s]*,[\s]*(\d+)[\s]*\)(\s*|$)/;
    const hideHeaderRegexp = /!hideHeader\(\)(\s*|$)/;
    const hideFieldsRegexp = /!hideFields\(\)(\s*|$)/;
    let finalString = '';

    splittedContentItems.forEach((splittedItem) => {
      let col;
      let row;
      let hideFields = false;
      let hideHeader = false;
      let processedSplittedItem = splittedItem;

      const matchPlacement = splittedItem.match(placementRegexp);
      const matchHideHeader = splittedItem.match(hideHeaderRegexp);
      const matchHideFields = splittedItem.match(hideFieldsRegexp);
      if (matchPlacement) {
        row = parseInt(matchPlacement[2], 10);
        col = parseInt(matchPlacement[3], 10);
      }

      if (matchHideFields) {
        hideFields = true;
      }

      if (matchHideHeader) {
        hideHeader = true;
      }

      if (col != null || row != null) {
        let layoutLine = `${matchPlacement?.[1] ?? ''}!layout(${row}, ${col}`;

        if (!hideHeader) {
          layoutLine += ', "title"';
        }
        if (!hideFields) {
          layoutLine += ', "headers"';
        }

        layoutLine += `)${matchPlacement?.[4] ?? ''}`;

        processedSplittedItem = processedSplittedItem
          .replace(hideFieldsRegexp, '')
          .replace(hideHeaderRegexp, '')
          .replace(placementRegexp, layoutLine);
      }

      finalString += processedSplittedItem;
    });

    data[sheetName] = finalString.trim() + '\n';
  }

  return yaml.stringify(data);
}
