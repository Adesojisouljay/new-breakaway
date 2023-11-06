import React, { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCommunityMessages } from "../utils";
import { History } from "history";
import { useMappedStore } from "../../../store/use-mapped-store";
import ChatsProfileBox from "./chat-profile-box";
import ChatsChannelMessages from "./chats-channel-messages";
import ChatsDirectMessages from "./chats-direct-messages";
import ChatInput from "./chat-input";
import ChatsScroller from "./chats-scroller";
import { CHATPAGE } from "./chat-popup/chat-constants";
import { ChatContext } from "../chat-context-provider";
import { classNameObject } from "../../../helper/class-name-object";
import { Channel, DirectMessage, PublicMessage } from "../managers/message-manager-types";
import { useMessagesQuery } from "../queries";
import isCommunity from "../../../helper/is-community";

interface Props {
  username: string;
  history: History;
  currentChannel: Channel;
  inProgress: boolean;
  currentChannelSetter: (channel: Channel) => void;
  setInProgress: (d: boolean) => void;
}

export default function ChatsMessagesView({
  username,
  currentChannel,
  inProgress,
  currentChannelSetter,
  setInProgress,
  history
}: Props) {
  const { messageServiceInstance } = useContext(ChatContext);
  const { data: messages } = useMessagesQuery(username.replace("@", ""));

  const messagesBoxRef = useRef<HTMLDivElement>(null);

  const { chat } = useMappedStore();
  const [directUser, setDirectUser] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [isScrollToBottom, setIsScrollToBottom] = useState(false);
  const [isTop, setIsTop] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    isDirectUserOrCommunity();
  }, []);

  useEffect(() => {
    if (messages.length < 25) {
      setHasMore(false);
    }
  }, [messages]);

  useEffect(() => {
    getChannelMessages();
  }, [chat.publicMessages]);

  useEffect(() => {
    if (directUser) {
      // getDirectMessages();
    } else if (communityName && currentChannel) {
      getChannelMessages();
    }
  }, [directUser, communityName, currentChannel, chat.directMessages]);

  useEffect(() => {
    setIsScrollToBottom(false);
    setDirectUser("");
    setCommunityName("");
    isDirectUserOrCommunity();
  }, [username]);

  useEffect(() => {
    if (isTop) {
      fetchPrevMessages();
    }
  }, [isTop]);

  const fetchPrevMessages = () => {
    if (!hasMore || inProgress) return;

    setInProgress(true);
    messageServiceInstance
      ?.fetchPrevMessages(currentChannel!.id, messages[0].created)
      .then((num) => {
        if (num < 25) {
          setHasMore(false);
        }
      })
      .finally(() => {
        setInProgress(false);
        setIsTop(false);
      });
  };

  const isDirectUserOrCommunity = () => {
    if (isCommunity(username)) {
      setCommunityName(username.replace("@", ""));
    } else {
      setDirectUser(username.replace("@", ""));
    }
  };

  const getChannelMessages = () => {
    if (currentChannel) {
      const publicMessages = fetchCommunityMessages(
        chat.publicMessages,
        currentChannel,
        currentChannel.hiddenMessageIds
      );
      const messages = publicMessages.sort((a, b) => a.created - b.created);
      // setPublicMessages(messages);
    }
  };

  const scrollToBottom = () => {
    messagesBoxRef &&
      messagesBoxRef?.current?.scroll({
        top: messagesBoxRef.current?.scrollHeight,
        behavior: "auto"
      });
  };

  const handleScroll = (event: React.UIEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const isScrollToBottom =
      element.scrollTop + messagesBoxRef?.current?.clientHeight! < element.scrollHeight - 200;
    setIsScrollToBottom(isScrollToBottom);
    const isScrolled = element.scrollTop + element.clientHeight <= element.scrollHeight - 20;
    setIsScrolled(isScrolled);
    const scrollerTop = element.scrollTop <= 600 && messages.length > 25;
    setIsTop(!!communityName && scrollerTop);
  };

  return (
    <>
      <div
        className={classNameObject({
          "h-full": true,
          "no-scroll": isTop && hasMore
        })}
        ref={messagesBoxRef}
        onScroll={handleScroll}
      >
        <Link
          className="after:!hidden"
          to={username.startsWith("@") ? `/${username}` : `/created/${username}`}
          target="_blank"
        >
          <ChatsProfileBox username={username} />
        </Link>
        {communityName.length !== 0 ? (
          <>
            <ChatsChannelMessages
              username={username}
              history={history}
              publicMessages={messages as PublicMessage[]}
              currentChannel={currentChannel!}
              isScrollToBottom={isScrollToBottom}
              from={CHATPAGE}
              isScrolled={isScrolled}
              scrollToBottom={scrollToBottom}
              currentChannelSetter={currentChannelSetter}
            />
          </>
        ) : (
          <ChatsDirectMessages
            directMessages={messages as DirectMessage[]}
            currentUser={directUser!}
            isScrolled={isScrolled}
            isScrollToBottom={isScrollToBottom}
            scrollToBottom={scrollToBottom}
          />
        )}
        {isScrollToBottom && (
          <ChatsScroller
            bodyRef={messagesBoxRef}
            isScrollToTop={false}
            isScrollToBottom={true}
            marginRight={"5%"}
          />
        )}
      </div>

      <div className="sticky bottom-0 border-t border-[--border-color] bg-white">
        <ChatInput
          isCurrentUser={!!directUser}
          isCommunity={!!communityName}
          currentUser={directUser}
          currentChannel={currentChannel!}
        />
      </div>
    </>
  );
}
