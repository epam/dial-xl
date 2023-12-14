import { FormulaEditor, MainMenu, ProjectTitle, Zoom } from '../components';
import { useShortcuts } from '../hooks';

export function ProjectPage() {
  useShortcuts();

  return (
    <>
      <div className="flex items-center">
        <MainMenu />
        <ProjectTitle />
        <Zoom />
      </div>
      <FormulaEditor />
    </>
  );
}
