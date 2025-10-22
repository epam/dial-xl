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

import { ColorSchema, logoSrcStorageKey } from '../../common';
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

  const logoSrc =
    localStorage.getItem(logoSrcStorageKey) ??
    window.externalEnv.defaultLogoUrl;

  return (
    <>
      <div
        className={cx(
          'shrink-0 grid grid-cols-12 items-center justify-between h-10 border-b border-b-stroke-tertiary px-4 w-screen',
          isReadOnlyMode && 'bg-bg-inverted',
          (isCSVViewMode || isAIPendingMode) && 'bg-bg-accent-tertiary',
          isAIPreviewMode && 'bg-bg-accent-secondary',
          isDefaultMode && 'bg-bg-layer-3'
        )}
      >
        <div className="flex items-center col-span-4">
          {isMobile ? (
            <>
              {logoSrc ? (
                <img
                  alt="custom logo"
                  className="h-5 min-w-5 mr-3"
                  src={logoSrc}
                />
              ) : (
                <Icon
                  className={cx(
                    'h-5 w-5 mr-3',
                    colorSchema === 'review' && 'text-text-inverted'
                  )}
                  component={() =>
                    colorSchema === 'review' ? <QGLogoMonochrome /> : <QGLogo />
                  }
                  onClick={() => setIsMobileMainMenuOpened(true)}
                />
              )}
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
                {logoSrc ? (
                  <img alt="custom logo" className="h-5" src={logoSrc} />
                ) : (
                  <>
                    <Icon
                      className={cx(
                        'h-5 w-5',
                        colorSchema === 'review' && 'text-text-inverted'
                      )}
                      component={() =>
                        colorSchema === 'review' ? (
                          <QGLogoMonochrome />
                        ) : (
                          <QGLogo />
                        )
                      }
                    />
                    <Icon
                      className={cx(
                        'hidden md:block shrink-0 ml-2 h-[10px] w-[50px]',
                        (colorSchema === 'review' || colorSchema === 'read') &&
                          'text-text-inverted',
                        colorSchema === 'default' && 'text-text-primary'
                      )}
                      component={() => <DialTextLogo />}
                    />
                  </>
                )}
              </Link>

              <MainMenu colorSchema={colorSchema} />
            </>
          )}
        </div>

        <ProjectTitle />

        <div className="flex items-center gap-4 justify-end col-span-4">
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
