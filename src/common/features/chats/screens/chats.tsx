import React, { useContext, useEffect, useMemo } from "react";
import { connect } from "react-redux";
import { match } from "react-router";
import NavBar from "../../../components/navbar";
import { pageMapDispatchToProps, pageMapStateToProps, PageProps } from "../../../pages/common";
import ChatsSideBar from "../components/chats-sidebar";
import Feedback from "../../../components/feedback";
import { useMappedStore } from "../../../store/use-mapped-store";
import { ChatContext } from "../chat-context-provider";
import ChatsMessagesBox from "../components/chat-message-box";
import { classNameObject } from "../../../helper/class-name-object";
import "./_chats.scss";
import { useChannelsQuery, useCommunityChannelQuery, useDirectContactsQuery } from "../queries";
import { useKeysQuery } from "../queries/keys-query";
import { ChatsWelcome } from "../components/chats-welcome";
import { useCommunityCache } from "../../../core";
import { useGetAccountFullQuery } from "../../../api/queries";
import { getUserChatPublicKey } from "../utils";
import useMountedState from "react-use/lib/useMountedState";
import { _t } from "../../../i18n";
import Meta from "../../../components/meta";
import { ChatsDefaultScreen } from "../components/chats-default-screen";
import { ChatsManageKeySection } from "./chats-manage-key-section";
import { ChatsUserNotJoinedSection } from "./chats-user-not-joined-section";

interface Props extends PageProps {
  match: match<{
    filter: string;
    name: string;
    path: string;
    url: string;
    username: string;
  }>;
}

export const Chats = ({ match, history }: Props) => {
  const { activeUser, global } = useMappedStore();
  const { receiverPubKey, revealPrivateKey, setReceiverPubKey, setRevealPrivateKey } =
    useContext(ChatContext);
  const { data: community } = useCommunityCache(match.params.username);

  const { publicKey, privateKey } = useKeysQuery();
  const { data: userAccount } = useGetAccountFullQuery(match.params.username?.replace("@", ""));
  const { data: directContacts } = useDirectContactsQuery();
  const { data: channels } = useChannelsQuery();
  const { data: communityChannel } = useCommunityChannelQuery(community ?? undefined);

  const isChannel = useMemo(
    () =>
      [...(channels ?? []), ...(communityChannel ? [communityChannel] : [])].some(
        (channel) => channel.communityName === match.params.username
      ),
    [channels, match.params.username, communityChannel]
  );

  const isReady = useMemo(
    () => !!(activeUser && publicKey && privateKey),
    [publicKey, privateKey, activeUser]
  );
  const isShowManageKey = useMemo(() => isReady && revealPrivateKey, [isReady, revealPrivateKey]);
  const isShowChatRoom = useMemo(
    () =>
      isReady && (!!receiverPubKey || isChannel) && !revealPrivateKey && !!match.params.username,
    [isReady, receiverPubKey, revealPrivateKey, isChannel, match]
  );
  const isShowDefaultScreen = useMemo(
    () => isReady && !receiverPubKey && !isChannel && !revealPrivateKey && !match.params.username,
    [isReady, receiverPubKey, revealPrivateKey, isChannel, match]
  );
  const isShowImportChats = useMemo(() => !isReady, [isReady]);

  const isMounted = useMountedState();

  const title = useMemo(() => {
    let title = _t("chat.page-title");

    if (community) {
      title = `${community.title} | ${title}`;
    } else if (userAccount) {
      title = `${userAccount.name} | ${title}`;
    }

    return title;
  }, [community, userAccount]);

  useEffect(() => {
    if (userAccount) {
      const key = getUserChatPublicKey(userAccount);
      setReceiverPubKey(key ?? "");
    }
  }, [userAccount]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return isMounted() ? (
    <div className="bg-blue-duck-egg dark:bg-transparent pt-[63px] min-h-[100vh]">
      <Feedback activeUser={activeUser} />
      <NavBar history={history} />
      <Meta title={title || _t("chat.page-title")} />

      <div className="container mx-auto md:py-6">
        <div className="grid grid-cols-12 overflow-hidden md:rounded-2xl bg-white border border-[--border-color] relative h-[100vh] md:h-auto">
          <div className="col-span-12 md:col-span-4 xl:col-span-3 border-r border-[--border-color] max-h-[calc(100vh-69px)] md:h-[calc(100vh-69px-3rem)] overflow-y-auto">
            {isReady ? <ChatsSideBar history={history} username={match.params.username} /> : <></>}
            {(!directContacts?.length || !channels?.length) && isShowDefaultScreen && (
              <ChatsDefaultScreen className="md:hidden" />
            )}
            {(!directContacts?.length || !channels?.length) && isShowImportChats && activeUser && (
              <div className="h-full w-full flex items-center justify-center md:hidden">
                <ChatsWelcome />
              </div>
            )}
            {!isShowChatRoom && isReady && match.params.username && (
              <ChatsUserNotJoinedSection match={match} className="md:hidden" />
            )}
          </div>
          <div
            className={classNameObject({
              "col-span-12 md:col-span-8 xl:col-span-9 max-h-[calc(100vh-69px)] md:h-[calc(100vh-69px-3rem)] overflow-y-auto absolute w-full bg-white z-10 md:static duration-500":
                true,
              "translate-x-0": isShowChatRoom || isShowManageKey,
              "translate-x-[100%] md:translate-x-0": !isShowChatRoom && !isShowManageKey
            })}
          >
            {isShowManageKey && <ChatsManageKeySection />}
            {isShowImportChats && activeUser && (
              <div className="h-full w-full flex items-center justify-center">
                <ChatsWelcome />
              </div>
            )}
            {isShowChatRoom && (
              <ChatsMessagesBox match={match} history={history} channel={communityChannel!!} />
            )}
            {!isShowChatRoom && isReady && match.params.username && (
              <ChatsUserNotJoinedSection match={match} />
            )}
            {isShowDefaultScreen && <ChatsDefaultScreen />}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <></>
  );
};
export default connect(pageMapStateToProps, pageMapDispatchToProps)(Chats);
