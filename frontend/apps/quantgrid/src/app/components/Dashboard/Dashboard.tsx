import { Input } from 'antd';
import Fuse from 'fuse.js';
import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { SearchOutlined } from '@ant-design/icons';

import { ProjectContext } from '../../context';
import { useApi } from '../../hooks';
import { sort } from '../../services';
import { DashboardProjectList } from './DashboardProjectList';
import { DashboardProjectsBar } from './DashboardProjectsBar';
import { DashboardTopSection } from './DashboardTopSection';

const fuseOptions = {
  includeScore: true,
  shouldSort: true,
  includeMatches: true,
  threshold: 0.3,
  keys: ['name'],
};

export function Dashboard() {
  const { projects } = useContext(ProjectContext);
  const { getProjects } = useApi();

  const [projectList, setProjectList] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>('');

  useEffect(() => {
    getProjects();
  }, [getProjects]);

  useEffect(() => {
    setProjectList(sort(projects, true));
    setSearchValue('');
  }, [projects]);

  const search = useCallback(
    (e: ChangeEvent) => {
      const searchValue = (e.target as HTMLInputElement).value;
      setSearchValue(searchValue);

      if (!searchValue) {
        setProjectList(sort(projects, sortAsc));

        return;
      }

      const fuse = new Fuse(projects, fuseOptions);
      const searchResult = fuse.search(searchValue).map((r) => r.item);
      setProjectList(sort(searchResult, sortAsc));
    },
    [projects, sortAsc]
  );

  const sortChange = useCallback(() => {
    setSortAsc(!sortAsc);
    setProjectList(sort(projectList, !sortAsc));
  }, [projectList, sortAsc]);

  return (
    <div className="flex flex-col text-slate-600 h-full">
      <div className="text-2xl font-bold py-8 ml-[20%]">
        Welcome to QuantGrid
      </div>

      <DashboardTopSection />

      <DashboardProjectsBar sortAsc={sortAsc} onSortChange={sortChange} />

      <div className="mt-7 mx-[20%] w-60">
        <Input
          placeholder="Search project"
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={search}
        />
      </div>

      <DashboardProjectList projectList={projectList} />
    </div>
  );
}
