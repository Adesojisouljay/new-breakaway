import React, { useEffect, useState } from "react";
import { Channel, Keys } from "../../../managers/message-manager-types";
import useDebounce from "react-use/lib/useDebounce";
import MessageService from "../../helper/message-service";
import { useMappedStore } from "../../store/use-mapped-store";
import { NostrKeysType } from "./types";
import {
  createNoStrAccount,
  getPrivateKey,
  getUserChatPublicKey,
  uploadChatPublicKey
} from "./utils";
import * as ls from "../../util/local-storage";
import { setNostrkeys } from "../../../managers/message-manager";
import { useMount } from "react-use";

interface Context {
  activeUserKeys: NostrKeysType;
  showSpinner: boolean;
  revealPrivKey: boolean;
  chatPrivKey: string;
  receiverPubKey: string;
  messageServiceInstance: MessageService | null;
  hasUserJoinedChat: boolean;
  currentChannel: Channel | null;
  showSideBar: boolean;
  windowWidth: number;
  maxHeight: number;
  isActveUserRemoved: boolean;
  setShowSideBar: (d: boolean) => void;
  setCurrentChannel: (channel: Channel) => void;
  setRevealPrivKey: (d: boolean) => void;
  setShowSpinner: (d: boolean) => void;
  setChatPrivKey: (key: string) => void;
  setActiveUserKeys: (keys: NostrKeysType) => void;
  setReceiverPubKey: (key: string) => void;
  setMessageServiceInstance: (instance: MessageService | null) => void;
  initMessageServiceInstance: (keys: Keys) => MessageService | null;
  joinChat: () => void;
}

interface Props {
  children: JSX.Element | JSX.Element[];
}

export const ChatContext = React.createContext<Context>({
  activeUserKeys: { pub: " ", priv: "" },
  showSpinner: false,
  revealPrivKey: false,
  chatPrivKey: "",
  receiverPubKey: "",
  messageServiceInstance: null,
  hasUserJoinedChat: false,
  currentChannel: null,
  showSideBar: true,
  windowWidth: 0,
  maxHeight: 0,
  isActveUserRemoved: false,
  setShowSideBar: () => {},
  setCurrentChannel: () => {},
  setRevealPrivKey: () => {},
  setShowSpinner: () => {},
  setChatPrivKey: () => {},
  setActiveUserKeys: () => {},
  setReceiverPubKey: () => {},
  setMessageServiceInstance: () => {},
  initMessageServiceInstance: () => (({} as MessageService) || null),
  joinChat: () => {}
});

export const ChatContextProvider = (props: Props) => {
  const { activeUser, resetChat } = useMappedStore();

  const [activeUserKeys, setActiveUserKeys] = useState<NostrKeysType>({ pub: " ", priv: "" });
  const [showSpinner, setShowSpinner] = useState(true);
  const [chatPrivKey, setChatPrivKey] = useState("");
  const [revealPrivKey, setRevealPrivKey] = useState(false);
  const [receiverPubKey, setReceiverPubKey] = useState("");
  const [messageServiceInstance, setMessageServiceInstance] = useState<MessageService | null>(null);
  const [hasUserJoinedChat, setHasUserJoinedChat] = useState(false);
  const [shouldUpdateProfile, setShouldUpdateProfile] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [showSideBar, setShowSideBar] = useState(true);
  const [windowWidth, setWindowWidth] = useState(0);
  const [maxHeight, setMaxHeight] = useState(0);
  const [isActveUserRemoved, setIsActiveUserRemoved] = useState(false);

  useMount(() => {
    getActiveUserKeys();
    handleShowSideBar();
    setWindowWidth(window.innerWidth);
    setMaxHeight(window.innerHeight - 66);
  });

  useEffect(() => {
    if (currentChannel && currentChannel.removedUserIds) {
      setIsActiveUserRemoved(currentChannel.removedUserIds?.includes(activeUserKeys?.pub!));
    }
  }, [currentChannel]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setMaxHeight(window.innerHeight - 66);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    getActiveUserKeys();
    if (messageServiceInstance) {
      setShouldUpdateProfile(false);
    }
  }, [messageServiceInstance]);

  useEffect(() => {
    window.addEventListener("resize", handleShowSideBar);
    return () => {
      window.removeEventListener("resize", handleShowSideBar);
    };
  }, []);

  useEffect(() => {
    if (shouldUpdateProfile && messageServiceInstance) {
      messageServiceInstance.updateProfile({
        name: activeUser?.username!,
        about: "",
        picture: ""
      });
    }
  }, [shouldUpdateProfile, messageServiceInstance]);

  useDebounce(() => setShowSpinner(false), 5000, [showSpinner]);

  const handleShowSideBar = () => {
    if (window.innerWidth < 768) {
      setShowSideBar(false);
    } else {
      setShowSideBar(true);
    }
  };

  const getActiveUserKeys = async () => {
    const pubKey = await getUserChatPublicKey(activeUser?.username!);
    const privKey = getPrivateKey(activeUser?.username!);
    setHasUserJoinedChat(!!pubKey);
    setChatPrivKey(privKey);
    setActiveUserKeys({ pub: pubKey, priv: privKey });
  };

  const initMessageServiceInstance = (keys: Keys) => {
    if (messageServiceInstance) {
      messageServiceInstance.close();
      setMessageServiceInstance(null);
    }

    let newMessageService: MessageService | null = null;
    if (keys) {
      newMessageService = new MessageService(keys.priv, keys.pub);
      setMessageServiceInstance(newMessageService);
    }
    return newMessageService;
  };

  const joinChat = async () => {
    resetChat();
    const keys = createNoStrAccount();
    ls.set(`${activeUser?.username}_nsPrivKey`, keys.priv);
    await uploadChatPublicKey(activeUser, keys.pub);
    setHasUserJoinedChat(true);
    setNostrkeys(keys);
    setChatPrivKey(keys.priv);
    setShouldUpdateProfile(true);
    setActiveUserKeys(keys);
  };

  return (
    <ChatContext.Provider
      value={{
        activeUserKeys,
        showSpinner,
        revealPrivKey,
        receiverPubKey,
        chatPrivKey,
        messageServiceInstance,
        hasUserJoinedChat,
        currentChannel,
        showSideBar,
        windowWidth,
        maxHeight,
        isActveUserRemoved,
        setShowSideBar,
        setCurrentChannel,
        setRevealPrivKey,
        setShowSpinner,
        setChatPrivKey,
        setActiveUserKeys,
        setReceiverPubKey,
        setMessageServiceInstance,
        initMessageServiceInstance,
        joinChat
      }}
    >
      {props.children}
    </ChatContext.Provider>
  );
};
