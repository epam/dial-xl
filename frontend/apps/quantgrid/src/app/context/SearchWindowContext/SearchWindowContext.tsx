import { createContext } from 'react';

import { ISearchFilter } from '../../components/SearchWindow/search';

type SearchWindowFunctions = {
  openSearchWindow: () => void;
  closeSearchWindow: () => void;
  setFilter: (filter: ISearchFilter | null) => void;
  setSearchQuery: (query: string) => void;
};

type SearchWindowValues = {
  isOpen: boolean;
  filter: ISearchFilter | null;
  searchQuery: string;
};

export const SearchWindowContext = createContext<
  SearchWindowFunctions & SearchWindowValues
>({} as SearchWindowFunctions & SearchWindowValues);
