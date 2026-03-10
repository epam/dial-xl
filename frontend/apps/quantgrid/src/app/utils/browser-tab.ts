export const updateTabTitle = (title: string) => {
  document.title = title;

  return document.title;
};

export const updateTabFavicon = (href: string, type: string) => {
  const link: HTMLLinkElement | null = document.querySelector(
    'link[data-type="favicon"]',
  );
  if (link) {
    link.href = href;
    link.type = type;
  }

  return link;
};
