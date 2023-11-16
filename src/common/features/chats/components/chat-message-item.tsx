import Tooltip from "../../../components/tooltip";
import { failedMessageSvg, resendMessageSvg } from "../../../img/svg";
import { formatMessageTime, isMessageGif, isMessageImage } from "../utils";
import { Spinner } from "@ui/spinner";
import React, { useMemo } from "react";
import { classNameObject } from "../../../helper/class-name-object";
import { renderPostBody } from "@ecency/render-helper";
import { useMappedStore } from "../../../store/use-mapped-store";
import { _t } from "../../../i18n";
import { ChatMessageChannelItemExtension } from "./chat-message-channel-item-extension";
import { Channel, Message } from "../nostr";
import { useKeysQuery } from "../queries/keys-query";

interface Props {
  type: "sender" | "receiver";
  message: Message;
  isSameUser: boolean;
  currentChannel?: Channel;
  onContextMenu?: () => void;
}

// TODO: Add resend
export function ChatMessageItem({
  type,
  message,
  isSameUser,
  currentChannel,
  onContextMenu
}: Props) {
  const { global } = useMappedStore();
  const { publicKey } = useKeysQuery();

  const isFailed = useMemo(() => message.sent === 2, [message]);
  const isSending = useMemo(() => message.sent === 0, [message]);
  const isGif = useMemo(() => isMessageGif(message.content), [message]);
  const isImage = useMemo(() => isMessageImage(message.content), [message]);
  const renderedPreview = useMemo(
    () =>
      renderPostBody(message.content, false, global.canUseWebp)
        .replace(/<p[^>]*>/g, "")
        .replace(/<\/p>/g, ""),
    [message]
  );

  return (
    <div key={message.id} data-message-id={message.id}>
      <div
        className={classNameObject({
          "flex gap-1 mb-4 px-4": true,
          "justify-start": type === "receiver",
          "justify-end": type === "sender",
          failed: isFailed,
          sending: isSending
        })}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.stopPropagation();
            e.preventDefault();
            onContextMenu();
          }
        }}
      >
        {currentChannel && message.creator !== publicKey && (
          <ChatMessageChannelItemExtension
            creator={message.creator}
            currentChannel={currentChannel}
          />
        )}
        {message.sent === 2 && (
          <Tooltip content={_t("g.resend")}>
            <span
              className="resend-svg"
              onClick={() => {
                // setStep(1);
                // setResendMessage(message);
              }}
            >
              {resendMessageSvg}
            </span>
          </Tooltip>
        )}
        <div
          className={classNameObject({
            "flex gap-1 flex-col": true,
            "items-start": type === "receiver",
            "items-end": type === "sender"
          })}
        >
          <div
            className={classNameObject({
              "text-sm p-2.5 rounded-b-2xl": !isGif && !isImage,
              "bg-blue-dark-sky text-white rounded-tl-2xl": type === "sender",
              "bg-gray-200 dark:bg-gray-800 rounded-tr-2xl": type === "receiver",
              "max-w-[300px] rounded-2xl overflow-hidden": isGif || isImage,
              "same-user-message": isSameUser
            })}
          >
            <div
              className="sender-message-content"
              dangerouslySetInnerHTML={{ __html: renderedPreview }}
            />
          </div>
          {message.sent == 1 && (
            <div className="text-gray-600 dark:text-gray-400 text-xs px-2">
              {formatMessageTime(message.created)}
            </div>
          )}
          {message.sent === 0 && <Spinner className="w-3 h-3 mx-2" />}
          {message.sent === 2 && (
            <Tooltip content={"Failed"}>
              <span className="failed-svg">{failedMessageSvg}</span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
