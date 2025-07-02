import ToolTip from "../tooltip";
import { _t } from "../../i18n";
import { Button } from "@ui/button";
import React, { useState } from "react";
import { useMappedStore } from "../../store/use-mapped-store";
import { Searchbar } from "./search";
import { History } from "history";
import { NavbarTextMenu } from "./navbar-text-menu";
import { classNameObject } from "../../helper/class-name-object";
import { NavbarSide } from "./sidebar/navbar-side";
import UserAvatar from "../user-avatar";
import UserNotifications from "../notifications";
import { NavbarNotificationsButton } from "./navbar-notifications-button";
import { UilEditAlt } from "@iconscout/react-unicons";
import { NavbarPerksButton } from "./navbar-perks-button";
import { AnonUserButtons } from "./anon-user-buttons";
import { NavbarMainSidebar } from "./navbar-main-sidebar";
import { NavbarMainSidebarToggle } from "./navbar-main-sidebar-toggle";
import { getBtcWalletBalance, getUserByUsername } from "../../api/breakaway";
import { error } from "../feedback";
import { Global } from "../../store/global/types";

interface Props {
  step?: number;
  transparentVerify: boolean;
  history: History;
  setStepOne?: () => void;
  setSmVisible: (v: boolean) => void;
  mainBarExpanded: boolean;
  setMainBarExpanded: (v: boolean) => void;
  global: Global;
}

export function NavbarDesktop({
  step,
  transparentVerify,
  history,
  setStepOne,
  mainBarExpanded,
  setMainBarExpanded,
  global
}: Props) {
  const { activeUser, ui, toggleUIProp } = useMappedStore();

  const [showSidebar, setShowSidebar] = useState(false);

  const openSubmitPage = async () => {
    console.log("object.....");
    // const { activeUser, history, community, global }  = props
    try {
      ////MIGHT NOT BE NEEDED IF WE ARE CHECKING BTC BALANCE ON LOGIN
      if (global.hive_id === "hive-125568" || global.hive_id === "hive-159314") {
        const baUser = await getUserByUsername(activeUser!.username);

        let btcAddress;

        if (baUser?.bacUser?.bitcoinAddress) {
          btcAddress = baUser?.bacUser?.bitcoinAddress;
          const addressBalance = await getBtcWalletBalance(baUser?.bacUser?.bitcoinAddress);
          if (addressBalance.balance < 0.00005) {
            error("You must have at least 0.00005 btc to create a post");
            return;
          } else {
            history.push(`/submit?com=${global?.hive_id}`);
          }
        } else {
          error("Sorry, you have no bitcoin profile");
          return;
        }
      } else {
        history.push(`/submit?com=${global?.hive_id}`);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div
      className={`hidden md:flex w-full select-none relative ${
        !transparentVerify && step === 1 ? "transparent" : ""
      } `}
    >
      <div
        className={classNameObject({
          "max-w-[1600px] w-full mx-auto flex items-center justify-between px-4 py-3 border-b dark:border-gray-800":
            true,
          "bg-white dark:bg-dark-700": true,
          transparent: !transparentVerify && step === 1
        })}
      >
        <NavbarMainSidebarToggle onClick={() => setMainBarExpanded(true)} />
        <div className="flex-1" />
        {/* <NavbarTextMenu /> discover and community */}
        <div className="flex-spacer" />
        {(step !== 1 || transparentVerify) && (
          <div className="max-w-[400px] w-full">
            <Searchbar history={history} />
          </div>
        )}
        <div className="flex items-center ml-3">
          <NavbarPerksButton />
          <ToolTip content={_t("navbar.post")}>
            <Button
              onClick={openSubmitPage}
              appearance="gray-link"
              className="ml-3"
              icon={<UilEditAlt />}
            />
          </ToolTip>
          <NavbarNotificationsButton />
          {activeUser && <NavbarNotificationsButton />}
        </div>
        <div className="btn-menu">
          <AnonUserButtons />
          {activeUser && (
            <div
              className="cursor-pointer ml-4"
              onClick={() => {
                setShowSidebar(true);
                if (ui.notifications) {
                  toggleUIProp("notifications");
                }
              }}
            >
              <UserAvatar size="medium" username={activeUser.username} />
            </div>
          )}
        </div>
      </div>
      {ui.notifications && <UserNotifications history={history} />}
      {activeUser && <NavbarSide history={history} show={showSidebar} setShow={setShowSidebar} />}
      <NavbarMainSidebar
        show={mainBarExpanded}
        setShow={setMainBarExpanded}
        history={history}
        setStepOne={setStepOne}
      />
    </div>
  );
}
