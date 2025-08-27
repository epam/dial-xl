export const stripNewLinesAtEnd = (content: string) => {
  const newContent = content.replaceAll(/((\r\n)*|(\n)*)*$/g, '');

  return newContent;
};
