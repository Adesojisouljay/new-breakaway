import React, { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import ChatsProfileBox from "./chat-profile-box";
import ChatsDirectMessages from "./chats-direct-messages";
import ChatInput from "./chat-input";
import { classNameObject } from "../../../helper/class-name-object";
import { ChatsChannelMessages } from "./chat-channel-messages";
import {
  Channel,
  DirectContact,
  DirectMessage,
  PublicMessage,
  useAddCommunityChannel,
  useMessagesQuery,
  useOriginalJoinedChannelsQuery
} from "@ecency/ns-query";
import { ChatChannelNotJoined } from "./chat-channel-not-joined";

interface Props {
  currentContact: DirectContact;
  currentChannel: Channel;
}

export default function ChatsMessagesView({ currentContact, currentChannel }: Props) {
  const messagesBoxRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useMessagesQuery(currentContact, currentChannel);
  const { data: channels } = useOriginalJoinedChannelsQuery();

  const isJoinedToChannel = useMemo(
    () => channels?.some((c) => c.id === currentChannel?.id) === true,
    [currentChannel, channels]
  );

  const { mutateAsync: addCommunityChannel, isLoading: isAddCommunityChannelLoading } =
    useAddCommunityChannel(currentChannel);

  return (
    <>
      <div
        className={classNameObject({
          "h-[100vh] md:h-full overflow-y-auto md:overflow-y-static": true
        })}
        ref={messagesBoxRef}
      >
        <Link
          className="after:!hidden"
          to={!!currentChannel ? `/created/${currentChannel?.name}` : `/@${currentContact?.name}`}
          target="_blank"
        >
          <ChatsProfileBox
            communityName={currentChannel?.communityName}
            currentUser={currentContact?.name}
          />
        </Link>
        {currentChannel ? (
          <>
            <ChatsChannelMessages
              publicMessages={messages as PublicMessage[]}
              currentChannel={currentChannel!}
              isPage={true}
            />
          </>
        ) : (
          <ChatsDirectMessages
            directMessages={messages as DirectMessage[]}
            currentContact={currentContact}
            isPage={true}
          />
        )}
      </div>

      <div className="sticky z-10 bottom-0 border-t border-[--border-color] bg-white pl-3">
        {!currentChannel || isJoinedToChannel ? (
          <ChatInput currentContact={currentContact} currentChannel={currentChannel} />
        ) : (
          <ChatChannelNotJoined channel={currentChannel} />
        )}
      </div>
    </>
  );
}
