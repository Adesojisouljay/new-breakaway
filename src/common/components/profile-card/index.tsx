import React, { useCallback, useEffect, useState } from "react";

import { History } from "history";

import { Link } from "react-router-dom";
import { RCAccount } from "@hiveio/dhive/lib/chain/rc";

import { Global } from "../../store/global/types";
import { Account, FullAccount } from "../../store/accounts/types";
import { ActiveUser } from "../../store/active-user/types";

import UserAvatar from "../user-avatar";
import Tooltip from "../tooltip";
import { Followers, Following } from "../friends";

import accountReputation from "../../helper/account-reputation";

import formattedNumber from "../../util/formatted-number";

import defaults from "../../constants/defaults.json";

import { findRcAccounts, rcPower } from "../../api/hive";

import { _t } from "../../i18n";

import { calendarRangeSvg, copyContent, earthSvg, nearMeSvg, rssSvg } from "../../img/svg";

import { EditPic } from "../community-card";
import { getRelationshipBetweenAccounts, getSubscriptions } from "../../api/bridge";
import { Skeleton } from "../skeleton";
import { dateToFormatted } from "../../helper/parse-date";
import isCommunity from "../../helper/is-community";
import { Subscription } from "../../store/subscriptions/types";
import { ResourceCreditsInfo } from "../rc-info";
import "./_index.scss";
import { Button } from "@ui/button";
import JoinCommunityChatBtn from "../../features/chats/components/join-community-chat-btn";
import { useCommunityCache } from "../../core";
import { getBtcWalletBalance, getUserByUsername } from "../../api/breakaway";
import { success } from "../feedback";

interface Props {
  global: Global;
  history: History;
  activeUser: ActiveUser | null;
  account: Account | any;
  section?: string;
  addAccount: (data: Account) => void;
  updateActiveUser: (data?: Account) => void;
}

export const ProfileCard = (props: Props) => {
  const [followersList, setFollowersList] = useState(false);
  const [followingList, setFollowingList] = useState(false);
  const [followsActiveUser, setFollowsActiveUser] = useState(false);
  const [isMounted, setIsmounted] = useState(false);
  const [followsActiveUserLoading, setFollowsActiveUserLoading] = useState(false);
  const [subs, setSubs] = useState([] as Subscription[]);
  const [rcPercent, setRcPercent] = useState(100);
  const [jsonMetaData, setJsonMetaData] = useState<any>(null);
  const [btcBalance, setBtcBalance] = useState<any>(0.0);
  const [loading, setLoading] = useState(false);

  const [, updateState] = useState();
  const forceUpdate = useCallback(() => updateState({} as any), []);

  const { data: community } = useCommunityCache(props.account?.name);

  const { activeUser, account, section, global } = props;

  useEffect(() => {
    if (activeUser && activeUser.username) {
      setFollowsActiveUserLoading(activeUser && activeUser.username ? true : false);
      getFollowsInfo(account?.name);
    }
    getSubscriptions(account?.name)
      .then((r) => {
        if (r) {
          const communities = r.filter((x) => x[2] === "mod" || x[2] === "admin");
          setSubs(communities);
        }
      })
      .catch((e) => {
        setSubs([]);
      });
    findRcAccounts(account?.name)
      .then((r: RCAccount[]) => {
        if (r && r[0]) {
          setRcPercent(rcPower(r[0]));
        }
      })
      .catch((e) => {
        setRcPercent(100);
      });
  }, [account]);

  useEffect(() => {
    setIsmounted(true);
    return () => setIsmounted(false);
  }, []);

  useEffect(() => {
    setFollowersList(false);
    setFollowingList(false);
    setFollowsActiveUserLoading(activeUser && activeUser.username ? true : false);
    isMounted && getFollowsInfo(account?.name);
  }, [account!?.name]);

  useEffect(() => {
    const getMetaData = () => {
      try {
        if (account) {
          const metaData = JSON?.parse(account!?.posting_json_metadata);
          setJsonMetaData(metaData);
        }
      } catch (error) {
        console.log(error);
      }
    };
    getMetaData();
  }, [account!]);

  useEffect(() => {
    getBtcBal();
  }, [account!]);

  const getFollowsInfo = (username: string) => {
    if (activeUser) {
      getRelationshipBetweenAccounts(username, activeUser.username)
        .then((res) => {
          setFollowsActiveUserLoading(false);
          setFollowsActiveUser(res?.follows || false);
        })
        .catch((error) => {
          setFollowsActiveUserLoading(false);
          setFollowsActiveUser(false);
        });
    }
  };

  const toggleFollowers = () => {
    setFollowersList(!followersList);
  };

  const toggleFollowing = () => {
    setFollowingList(!followingList);
  };

  const getBtcBal = async () => {
    setLoading(true);

    try {
      if (account) {
        const baUser = await getUserByUsername(account!?.name);

        if (baUser?.bacUser?.bitcoinAddress) {
          const btcAddress = baUser?.bacUser?.bitcoinAddress;
          const addressBalance = await getBtcWalletBalance(btcAddress);
          setBtcBalance(addressBalance?.balance);
        }
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  };

  const formatString = (str: string) =>
    str?.length <= 20 ? str : str?.slice(0, 5) + "..." + str?.slice(-10);

  const copyToClipboard = (text: string) => {
    const textField = document.createElement("textarea");
    textField.innerText = text;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand("copy");
    textField.remove();
    success("Copied to clipboard");
  };
  const loggedIn = activeUser && activeUser.username;
  // TODO: use better conditions throughout app than .__loaded, remove all instances that rely on .__loaded

  if (!account?.__loaded) {
    return (
      <div className="profile-card">
        <div className="profile-avatar">
          <UserAvatar username={account?.name} size="xLarge" />
        </div>

        <h1>
          <div className="username">{account?.name}</div>
        </h1>
      </div>
    );
  }

  const isMyProfile =
    activeUser &&
    activeUser.username === account?.name &&
    activeUser.data.__loaded &&
    activeUser.data.profile;
  const isSettings = section === "settings";

  return (
    <div className="profile-card">
      <div className="profile-avatar">
        <UserAvatar username={account?.name} size="xLarge" src={account.profile?.profile_image} />
        {isMyProfile && isSettings && (
          <EditPic
            {...props}
            account={account as FullAccount}
            activeUser={activeUser!}
            onUpdate={() => {
              forceUpdate();
            }}
          />
        )}
        {account.__loaded && (
          <div className="reputation">{accountReputation(account.reputation!)}</div>
        )}
      </div>

      <h1>
        <div className="username">{account?.name}</div>
      </h1>

      {loggedIn && !isMyProfile && (
        <div className="flex mb-3">
          {followsActiveUserLoading ? (
            <Skeleton className="loading-follows-you" />
          ) : followsActiveUser ? (
            <div className="follow-pill inline lowercase">{_t("profile.follows-you")}</div>
          ) : null}
        </div>
      )}

      {(account.profile?.name || account.profile?.about) && (
        <div className="basic-info">
          {account.profile?.name && <div className="full-name">{account.profile.name}</div>}
          {account.profile?.about && <div className="about">{account.profile.about}</div>}
        </div>
      )}

      <div>
        <ResourceCreditsInfo {...props} rcPercent={rcPercent} account={account} />
      </div>

      {((global?.communityTitle === "Bitcoin Machines" && global?.hive_id === "hive-159314") ||
        global?.hive_id === "hive-125568") &&
        (jsonMetaData?.bitcoin ? (
          <div className="btc-profile">
            <h5>BTC info</h5>
            <div className="btc-info">
              <span>Address:</span>
              <span
                className="b-info"
                onClick={() => copyToClipboard(jsonMetaData?.bitcoin.address)}
              >
                {formatString(jsonMetaData?.bitcoin?.address)}
                {copyContent}
              </span>
            </div>
            <div className="btc-info">
              {global.hive_id === "hive-159314" && jsonMetaData?.bitcoin?.ordinalAddress && (
                <>
                  <span>Ordinals:</span>
                  <span
                    className="b-info"
                    onClick={() => copyToClipboard(jsonMetaData?.bitcoin?.ordinalAddress)}
                  >
                    {formatString(jsonMetaData?.bitcoin?.ordinalAddress)}
                    {copyContent}
                  </span>
                </>
              )}
            </div>
            <div className="btc-info">
              <span>Btc Balance:</span>
              <span className="b-info">
                {loading ? "fetching balance..." : btcBalance?.toFixed(7)}
              </span>
            </div>
            <div className="btc-info">
              <span>Message:</span>
              <span
                className="b-info"
                onClick={() => copyToClipboard(jsonMetaData?.bitcoin?.message)}
              >
                {jsonMetaData?.bitcoin?.message}
                {copyContent}
              </span>
            </div>
            <div className="btc-info">
              <span>Signature:</span>
              <span
                className="b-info"
                onClick={() => copyToClipboard(jsonMetaData?.bitcoin?.signature)}
              >
                {formatString(jsonMetaData?.bitcoin?.signature)}
                {copyContent}
              </span>
              <a
                href="https://www.verifybitcoinmessage.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Click to Verify signature
              </a>
            </div>
          </div>
        ) : (
          <div className="btc-profile">
            <span style={{ fontSize: "18px" }}>No bitcoin profile added</span>
            {activeUser?.username === account?.name && (
              <a
                href="https://onboard.bitcoinmachines.community/add-btc-profile"
                target="_blank"
                rel="noopener noreferrer"
              >
                Click to add bitcoin profile
              </a>
            )}
          </div>
        ))}

      {account.__loaded && (
        <div className="stats">
          {account.follow_stats?.follower_count !== undefined && (
            <div className="stat followers">
              <Tooltip content={_t("profile.followers")}>
                <span onClick={toggleFollowers}>
                  {formattedNumber(account.follow_stats.follower_count, { fractionDigits: 0 })}{" "}
                  {_t("profile.followers")}
                </span>
              </Tooltip>
            </div>
          )}

          {account.follow_stats?.following_count !== undefined && (
            <div className="stat following">
              <Tooltip content={_t("profile.following")}>
                <span onClick={toggleFollowing}>
                  {formattedNumber(account.follow_stats.following_count, { fractionDigits: 0 })}{" "}
                  {_t("profile.following")}
                </span>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      <div className="extra-props">
        {account.profile?.location && (
          <div className="prop">
            {nearMeSvg} {account.profile.location}
          </div>
        )}

        {account.profile?.website && (
          <div className="prop">
            {earthSvg}
            <a
              target="_external"
              className="website-link"
              href={`https://${account.profile.website.replace(/^(https?|ftp):\/\//, "")}`}
            >
              {account.profile.website}
            </a>
          </div>
        )}

        {account.created && (
          <div className="prop">
            {calendarRangeSvg} {dateToFormatted(account.created, "LL")}
          </div>
        )}

        <div className="prop">
          {rssSvg}
          <a target="_external" href={`${defaults.base}/@${account?.name}/rss`}>
            RSS feed
          </a>
        </div>
      </div>

      {subs.length > 0 && (
        <div className="com-props">
          <div className="com-title">{_t("profile.com-mod")}</div>
          {subs.map((x) => (
            <Link className="prop" key={x[0]} to={`/created/${x[0]}`}>
              {x[1]}
            </Link>
          ))}
        </div>
      )}
      <div className="btn-controls flex flex-wrap gap-3">
        {isCommunity(account?.name) && (
          <>
            <Link to={`/created/${account?.name}`}>
              <Button size="sm">{_t("profile.go-community")}</Button>
            </Link>
            {!!community && <JoinCommunityChatBtn history={props.history} community={community} />}
          </>
        )}
        {isMyProfile && (
          <>
            {global.usePrivate && (
              <Link to={`/@${account?.name}/referrals`}>
                <Button size="sm">{_t("profile.referrals")}</Button>
              </Link>
            )}
            <Link to="/witnesses">
              <Button size="sm">{_t("profile.witnesses")}</Button>
            </Link>
            <Link to="/proposals">
              <Button size="sm">{_t("profile.proposals")}</Button>
            </Link>
          </>
        )}
      </div>

      {followersList && <Followers {...props} account={account} onHide={toggleFollowers} />}
      {followingList && <Following {...props} account={account} onHide={toggleFollowing} />}
    </div>
  );
};

export default (p: Props) => {
  const props: Props = {
    global: p.global,
    history: p.history,
    activeUser: p.activeUser,
    account: p.account,
    section: p.section,
    addAccount: p.addAccount,
    updateActiveUser: p.updateActiveUser
  };

  return <ProfileCard {...props} />;
};
