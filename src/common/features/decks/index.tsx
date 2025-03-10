import React, { useEffect, useState } from "react";
import { useNav } from "../../util/use-nav";
import "./_deck.scss";
import "./_index.scss";
import { DeckGrid } from "./deck-grid";
import { DeckManager } from "./deck-manager";
import { History } from "history";
import { DeckToolbar } from "./deck-toolbar/deck-toolbar";
import { DeckFloatingManager } from "./deck-floating-manager";
import { DeckLoader } from "./deck-loader";
import { DeckThreadsForm, DeckThreadsFormManager } from "./deck-threads-form";
import { DeckThreadsManager } from "./columns/deck-threads-manager";
import SSRSuspense from "../../components/ssr-suspense";
import { classNameObject } from "../../helper/class-name-object";
import useMount from "react-use/lib/useMount";
import { DeckFloatingToolbarActivator } from "./deck-toolbar/deck-floating-toolbar-activator";

interface Props {
  history: History;
}

export const Decks = ({ history }: Props) => {
  const { setNavShow } = useNav();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setNavShow(false);
  }, []);

  useMount(() => {
    if (window.innerWidth <= 576) {
      setIsCollapsed(true);
    }
  });

  return (
    <SSRSuspense fallback={<>Decks not available in a server</>}>
      <DeckManager>
        {({ isDecksLoading }) => (
          <DeckThreadsManager>
            <DeckThreadsFormManager>
              {({ show: showThreadsForm }) => (
                <div
                  className={classNameObject({
                    "decks grid grid-cols-deck items-center duration-300": true,
                    "w-full": !isCollapsed,
                    expanded: isExpanded,
                    "toolbar-collapsed translate-x-[-72px] w-[calc(100%+72px)] sm:translate-x-0 sm:w-[auto]":
                      isCollapsed,
                    "thread-form-showed": showThreadsForm
                  })}
                >
                  <DeckFloatingToolbarActivator
                    open={!isCollapsed}
                    setOpen={(v) => setIsCollapsed(!v)}
                  />
                  <DeckToolbar
                    history={history}
                    isExpanded={isExpanded}
                    setIsExpanded={setIsExpanded}
                  />
                  <DeckThreadsForm className={showThreadsForm ? "show" : ""} persistable={true} />
                  {isDecksLoading ? (
                    <DeckLoader />
                  ) : (
                    <>
                      <div className="decks-container w-full overflow-hidden">
                        {/*<DeckSmoothScroller>*/}
                        <DeckGrid history={history} />
                        {/*</DeckSmoothScroller>*/}
                      </div>
                      <DeckFloatingManager />
                    </>
                  )}
                </div>
              )}
            </DeckThreadsFormManager>
          </DeckThreadsManager>
        )}
      </DeckManager>
    </SSRSuspense>
  );
};
