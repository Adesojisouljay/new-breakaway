import { useMappedStore } from "../../../../store/use-mapped-store";
import React, { useContext, useState } from "react";
import { DeckGridContext } from "../../deck-manager";
import { UserAvatar } from "../../../../components/user-avatar";
import { DeckAddColumnSearchBox } from "./deck-add-column-search-box";
import { SettingsProps, UsernameDataItem } from "./common";
import { ICONS, NOTIFICATION_CONTENT_TYPES } from "../../consts";
import { _t } from "../../../../i18n";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { PREFIX } from "../../../../util/local-storage";
import { Button } from "@ui/button";

export const DeckAddColumnNotificationsSettings = ({ deckKey }: SettingsProps) => {
  const { global } = useMappedStore();

  const { add } = useContext(DeckGridContext);

  const [username, setUsername] = useState("");
  const [tag, setTag] = useState("");
  const [contentType, setContentType] = useState<string | null>(null);
  const [recent, setRecent] = useLocalStorage<UsernameDataItem[]>(PREFIX + "_dnr", []);

  return (
    <div className="deck-add-column-user-settings p-3">
      <div className="helper-text">{_t("decks.columns.add-username-text")}</div>
      <div className="subtitle py-3">{_t("g.username")}</div>
      {username ? (
        <div className="selected-user" onClick={() => setUsername("")}>
          <UserAvatar size="medium" global={global} username={username} />
          <div className="username">{username}</div>
          <div className="click-to-change">{_t("decks.columns.click-to-change")}</div>
        </div>
      ) : (
        <DeckAddColumnSearchBox
          username={username}
          setUsername={setUsername}
          recentList={recent}
          setRecentList={setRecent}
          setItem={({ tag }) => setTag(tag ?? "")}
        />
      )}
      {username !== "" ? (
        <>
          <div className="subtitle py-3 mt-3">{_t("decks.filters")}</div>
          <div className="content-type-list">
            {NOTIFICATION_CONTENT_TYPES.map(({ title, type }) => (
              <div
                className={"content-type-item " + (contentType === type ? "selected" : "")}
                key={title}
                onClick={() => setContentType(type)}
              >
                {ICONS.n[type as keyof typeof ICONS.n]}
                <div className="title">{title}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <></>
      )}
      {username !== "" && contentType !== null ? (
        <Button
          disabled={!username || !contentType}
          className="w-full mt-5 sticky-bottom"
          onClick={() =>
            add({
              key: deckKey,
              type: "n",
              settings: {
                username,
                contentType,
                updateIntervalMs: 60000,
                tag
              }
            })
          }
        >
          {_t("g.continue")}
        </Button>
      ) : (
        <></>
      )}
    </div>
  );
};
