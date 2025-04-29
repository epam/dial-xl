export const stripNewLinesAtEnd = (content: string) => {
  const newContent = content.replace(/([ \r\n])*$/, '');

  return newContent;
};
