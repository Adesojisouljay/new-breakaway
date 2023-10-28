import { getDirectLastMessage, getRelativeDate } from "../../utils";
import { Link } from "react-router-dom";
import React, { useContext, useMemo } from "react";
import { DirectContact } from "../../../../../managers/message-manager-types";
import { ChatContext } from "../../chat-context-provider";
import UserAvatar from "../../../../components/user-avatar";
import { useMappedStore } from "../../../../store/use-mapped-store";
import { classNameObject } from "../../../../helper/class-name-object";

interface Props {
  contact: DirectContact;
  username: string;
  handleRevealPrivKey: () => void;
}

export function ChatSidebarDirectContact({ contact, username, handleRevealPrivKey }: Props) {
  const { setReceiverPubKey } = useContext(ChatContext);
  const { chat } = useMappedStore();

  const lastMessage = useMemo(
    () => getDirectLastMessage(contact.pubkey, chat.directMessages),
    [chat, contact]
  );
  const lastMessageDate = useMemo(() => getRelativeDate(lastMessage?.created), [lastMessage]);

  return (
    <Link
      className={classNameObject({
        "flex items-center text-dark-200 gap-3 p-3 border-b border-[--border-color] last:border-0 hover:bg-gray-100 dark:hover:bg-gray-800":
          true,
        "bg-gray-100 dark:bg-gray-800": username === `@${contact.name}`
      })}
      to={`/chats/@${contact.name}`}
      onClick={() => {
        setReceiverPubKey(contact.pubkey);
        handleRevealPrivKey();
      }}
    >
      <UserAvatar username={contact.name} size="medium" />
      <div className="flex flex-col w-[calc(100%-40px-0.75rem)]">
        <div className="flex justify-between w-full items-center">
          <div className="font-semibold truncate dark:text-white">{contact.name}</div>
          <div className="text-xs text-gray-500">{lastMessageDate}</div>
        </div>
        <div className="text-sm text-gray-600 truncate">{lastMessage?.content}</div>
      </div>
    </Link>
  );
}
