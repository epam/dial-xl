import { useContext } from 'react';
import { Link } from 'react-router-dom';

import Icon from '@ant-design/icons';
import { DialTextLogo, QGLogo } from '@frontend/common';

import { routes } from '../../../AppRoutes';
import { AppContext } from '../../context';
import {
  useDNDSpreadsheetFile,
  usePointClickClickWatcher,
  useShortcuts,
} from '../../hooks';
import { useIntellisenseFormulasClick } from '../../hooks/useIntellisenseFormulasClick';
import { ChatButton, ChatFloatingWindow } from '../ChatWrapper';
import { FormulasMenu } from '../Formulas/FormulasMenu';
import { FormulaBar, MainMenu, UserMenu } from '../index';
import { AIPendingChangesBanner } from './AIPendingChanges';
import { ProjectTitle } from './ProjectTitle';
import { ReadonlyNotificationBar } from './ReadonlyNotificationBar';
import { SearchButton } from './SearchButton';
import { TemporaryProjectNotificationBar } from './TemporaryProjectNotificationBar';
import { Zoom } from './Zoom';

export function Project() {
  const {
    chatWindowPlacement,
    formulasMenuPlacement,
    formulasMenuTriggerContext,
    setFormulasMenu,
  } = useContext(AppContext);

  useShortcuts();
  usePointClickClickWatcher();
  useDNDSpreadsheetFile();

  useIntellisenseFormulasClick(setFormulasMenu);

  return (
    <>
      <div className="flex items-center justify-between h-10 bg-bgLayer3 border-b border-b-strokeTertiary px-4 w-screen">
        <div className="flex items-center">
          <Link
            className="flex items-center mr-3 min-w-20 cursor-pointer"
            to={routes.home}
          >
            <Icon className="h-5 w-5" component={() => <QGLogo />} />
            <Icon
              className="ml-2 fill-textPrimary h-[10px] w-[50px]"
              component={() => <DialTextLogo />}
            />
          </Link>
          <MainMenu />
        </div>

        <ProjectTitle />

        <div className="flex items-center">
          <SearchButton />
          <Zoom />
          <UserMenu placement="project" />
        </div>
      </div>
      <ReadonlyNotificationBar />
      <AIPendingChangesBanner />
      <TemporaryProjectNotificationBar />
      <FormulaBar />

      {chatWindowPlacement === 'floating' && (
        <>
          <ChatButton />
          <ChatFloatingWindow />
        </>
      )}

      <FormulasMenu
        place={formulasMenuTriggerContext}
        position={formulasMenuPlacement}
      />
    </>
  );
}
