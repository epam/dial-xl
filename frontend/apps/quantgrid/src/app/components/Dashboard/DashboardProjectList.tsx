import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { FolderOutlined } from '@ant-design/icons';

import { AppContext } from '../../context';

type Props = {
  projectList: string[];
};
export function DashboardProjectList({ projectList }: Props) {
  const { setLoading } = useContext(AppContext);
  const navigate = useNavigate();

  return (
    <div className="mx-[20%] h-full overflow-y-auto mt-4">
      {!projectList || projectList.length === 0 ? (
        <span className="text-lg">No projects found</span>
      ) : (
        <div className="flex flex-col">
          {projectList.map((project) => (
            <div
              className="flex flex-row justify-start items-center py-4 pl-2 border-b border-b-gray-300 cursor-pointer hover:bg-slate-100"
              key={project}
              onClick={() => {
                setLoading(true);
                navigate(`/${project}`);
              }}
            >
              <FolderOutlined className="mr-3 text-lg" />
              <span className="text-lg">{project}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
