import { Drawer } from 'antd';
import cx from 'classnames';
import { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '@ant-design/icons';
import {
  DialTextLogo,
  QGLogo,
  QGLogoMonochrome,
  useIsMobile,
} from '@frontend/common';

import { ColorSchema } from '../../common';
import { AppContext } from '../../context';
import {
  useDNDSpreadsheetFile,
  usePointClickClickWatcher,
  useProjectMode,
  useShortcuts,
  useUnsavedChanges,
} from '../../hooks';
import { useIntellisenseFormulasClick } from '../../hooks/useIntellisenseFormulasClick';
import { routes } from '../../types';
import { ChatButton, ChatFloatingWindow } from '../ChatWrapper';
import { FormulasMenu } from '../Formulas/FormulasMenu';
import { FormulaBar, MainMenu, UserMenu } from '../index';
import { ProjectOverrideBar } from './ProjectOverrideBar';
import { ProjectTitle } from './ProjectTitle';
import { SearchButton } from './SearchButton';
import { ShareButton } from './ShareButton';

export function Project() {
  const {
    chatWindowPlacement,
    formulasMenuPlacement,
    formulasMenuTriggerContext,
    setFormulasMenu,
  } = useContext(AppContext);
  const [isMobileMainMenuOpened, setIsMobileMainMenuOpened] = useState(false);
  const isMobile = useIsMobile();
  const {
    isReadOnlyMode,
    isAIPreviewMode,
    isCSVViewMode,
    isDefaultMode,
    isAIPendingMode,
  } = useProjectMode();

  useShortcuts();
  usePointClickClickWatcher();
  useDNDSpreadsheetFile();
  useIntellisenseFormulasClick(setFormulasMenu);
  useUnsavedChanges(isCSVViewMode || isAIPendingMode);

  const colorSchema: ColorSchema = useMemo(() => {
    if (isReadOnlyMode) return 'read';
    if (isDefaultMode) return 'default';

    return 'review';
  }, [isDefaultMode, isReadOnlyMode]);

  return (
    <>
      <div
        className={cx(
          'shrink-0 flex items-center justify-between h-10 border-b border-b-strokeTertiary px-4 w-screen',
          isReadOnlyMode && 'bg-bgInverted',
          (isCSVViewMode || isAIPendingMode) && 'bg-bgAccentTertiary',
          isAIPreviewMode && 'bg-bgAccentSecondary',
          isDefaultMode && 'bg-bgLayer3'
        )}
      >
        <div className="flex items-center">
          {isMobile ? (
            <>
              <Icon
                className={cx(
                  'h-5 w-5 mr-3',
                  colorSchema === 'review' && 'text-textInverted'
                )}
                component={() =>
                  colorSchema === 'review' ? <QGLogoMonochrome /> : <QGLogo />
                }
                onClick={() => setIsMobileMainMenuOpened(true)}
              />
              <ShareButton />
              <Drawer
                open={isMobileMainMenuOpened}
                placement="left"
                title={
                  <div className="flex items-center">
                    <Icon className="h-5 w-5" component={QGLogo} />
                    <Icon
                      className="ml-2 h-[10px] w-[50px]"
                      component={DialTextLogo}
                    />
                  </div>
                }
                onClose={() => setIsMobileMainMenuOpened(false)}
              >
                <MainMenu
                  colorSchema={colorSchema}
                  isMobile
                  onClose={() => setIsMobileMainMenuOpened(false)}
                />
              </Drawer>
            </>
          ) : (
            <>
              <Link
                className="hidden md:flex items-center mr-3 cursor-pointer"
                to={routes.home}
              >
                <Icon
                  className={cx(
                    'h-5 w-5',
                    colorSchema === 'review' && 'text-textInverted'
                  )}
                  component={() =>
                    colorSchema === 'review' ? <QGLogoMonochrome /> : <QGLogo />
                  }
                />
                <Icon
                  className={cx(
                    'hidden md:block shrink-0 ml-2 h-[10px] w-[50px]',
                    (colorSchema === 'review' || colorSchema === 'read') &&
                      'text-textInverted',
                    colorSchema === 'default' && 'text-textPrimary'
                  )}
                  component={() => <DialTextLogo />}
                />
              </Link>

              <MainMenu colorSchema={colorSchema} />
            </>
          )}
        </div>

        <ProjectTitle />

        <div className="flex items-center gap-4">
          {!isMobile && <ShareButton />}
          <SearchButton colorSchema={colorSchema} />
          <UserMenu colorSchema={colorSchema} placement="project" />
        </div>
      </div>
      <ProjectOverrideBar />
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
