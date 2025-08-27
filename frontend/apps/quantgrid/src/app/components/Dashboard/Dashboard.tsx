import { DashboardAppHeader } from './DashboardAppHeader';
import { DashboardFileList } from './DashboardFileList/DashboardFileList';
import { DashboardSearchBar } from './DashboardSearchBar';
import { DashboardTabs } from './DashboardTabs';

export function Dashboard() {
  return (
    <div className="flex flex-col text-slate-600 h-dvh bg-bgLayer2">
      <DashboardAppHeader />

      <div className="flex flex-col h-full gap-3 md:gap-5 mx-3 md:mx-5 lg:mx-[20%] py-3 md:py-8 overflow-auto">
        <DashboardSearchBar />

        <DashboardTabs />

        <DashboardFileList />
      </div>
    </div>
  );
}
