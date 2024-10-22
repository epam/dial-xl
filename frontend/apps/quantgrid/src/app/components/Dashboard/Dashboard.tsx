import { DashboardAppHeader } from './DashboardAppHeader';
import { DashboardFileList } from './DashboardFileList/DashboardFileList';
import { DashboardSearchBar } from './DashboardSearchBar';
import { DashboardTabs } from './DashboardTabs';

export function Dashboard() {
  return (
    <div className="flex flex-col text-slate-600 h-screen bg-bgLayer2">
      <DashboardAppHeader />

      <div className="flex flex-col h-full mx-5 lg:mx-[20%] py-8 overflow-auto">
        <DashboardSearchBar />

        <DashboardTabs />

        <DashboardFileList />
      </div>
    </div>
  );
}
