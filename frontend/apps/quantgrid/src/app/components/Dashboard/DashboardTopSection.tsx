import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FolderAddOutlined, FolderOutlined } from '@ant-design/icons';

import { AppContext, ProjectContext } from '../../context';
import { getRecentProjects, RecentProject } from '../../services';
import { formatTimeAgo } from '../UndoRedo/formatTimeAgo';

export function DashboardTopSection() {
  const { projects, createProject } = useContext(ProjectContext);
  const { setLoading } = useContext(AppContext);
  const navigate = useNavigate();

  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    setRecentProjects(getRecentProjects());
  }, [projects]);

  return (
    <div className="w-full p-8 bg-gray-100 px-[20%]">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-lg font-bold mb-4">Create</span>
          <div
            className="flex flex-col justify-center items-center bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-400 hover:border w-[150px] h-[150px] cursor-pointer"
            onClick={createProject}
          >
            <FolderAddOutlined className="text-2xl" />
            <span className="text-xl font-medium">Project</span>
          </div>
        </div>

        <div className="flex flex-col min-w-[260px] max-w-[300px]">
          <span className="text-lg font-bold mb-4">Recent projects</span>
          <div className="flex flex-col">
            {recentProjects.length === 0 && <span>no recent projects yet</span>}
            {recentProjects.map((project) => (
              <div
                className="flex flex-row justify-between items-center py-2 px-2 cursor-pointer hover:bg-amber-200"
                key={project.projectName}
                onClick={() => {
                  setLoading(true);
                  navigate(`/${project.projectName}/${project.sheetName}`);
                }}
              >
                <div className="flex">
                  <FolderOutlined className="mr-3 text-base" />
                  <span className="text-base text-ellipsis overflow-hidden max-w-[170px]">
                    {project.projectName}
                  </span>
                </div>
                <span className="text-xs text-slate-500 text-right min-w-max">
                  {formatTimeAgo(project.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
