import React, { Component, Fragment, useEffect, useState } from "react";
import { History } from "history";
import { ActiveUser } from "../../store/active-user/types";
import { Account } from "../../store/accounts/types";
import { Global } from "../../store/global/types";
import { DynamicProps } from "../../store/dynamic-props/types";
import { Transactions } from "../../store/transactions/types";
import { PointTransaction, TransactionType } from "../../store/points/types";
import DropDown from "../dropdown";
import Transfer from "../transfer";
import Tooltip from "../tooltip";
import Purchase from "../purchase";
import Promote from "../promote";

import LinearProgress from "../linear-progress";
import WalletMenu from "../wallet-menu";
import EntryLink from "../entry-link";

import { error, success } from "../feedback";

import { _t } from "../../i18n";

import { claimPoints, getCurrencyTokenRate } from "../../api/private-api";
import "./index.scss";

import {
  accountGroupSvg,
  accountOutlineSvg,
  cashSvg,
  checkAllSvg,
  chevronUpSvg,
  commentSvg,
  compareHorizontalSvg,
  gpsSvg,
  pencilOutlineSvg,
  plusCircle,
  repeatSvg,
  starOutlineSvg,
  ticketSvg
} from "../../img/svg";
import FormattedCurrency from "../formatted-currency";
import { dateToFullRelative } from "../../helper/parse-date";
import { PurchaseQrDialog } from "../purchase-qr";
import { PurchaseTypes } from "../purchase-qr/purchase-types";
import { FormControl } from "@ui/input";
import { usePointsQuery } from "../../api/queries";
import { useQueryClient } from "@tanstack/react-query";
import { QueryIdentifiers } from "../../core";
import { claimBaPoints, getBaUserPoints } from "../../api/breakaway";
import axios, { AxiosResponse } from "axios";
import { getCommunity } from "../../api/bridge";
import { Button } from "react-bootstrap";
import { ExternalWalletSetUp } from "../set-up-external-wallet";
import { deriveAddresses, generateMnemonic, getWalletInfo } from "../../api/external-wallets";
import { buildHiveWalletTokens } from "../../helper/external-wallet";
import { updateHiveMetadataWithKeychain } from "../../api/operations";
import { WalletReceiveModal } from "../wallet-external-modal/receive";
import { WalletSendModal } from "../wallet-external-modal/send";

export const formatMemo = (memo: string, history: History) => {
  return memo.split(" ").map((x) => {
    if (x.indexOf("/") >= 3) {
      const [author, permlink] = x.split("/");
      return (
        <Fragment key={x}>
          {EntryLink({
            history: history,
            entry: { category: "ecency", author: author.replace("@", ""), permlink },
            children: (
              <span>
                {"@"}
                {author.replace("@", "")}/{permlink}
              </span>
            )
          })}{" "}
        </Fragment>
      );
    }

    return <Fragment key={x}>{x} </Fragment>;
  });
};

interface TransactionRowProps {
  history: History;
  tr: PointTransaction | any;
  pointsHistory: any;
}

export class TransactionRow extends Component<TransactionRowProps> {
  render() {
    const { tr, history } = this.props;

    let icon: JSX.Element | null = null;
    let lKey = "";
    const lArgs = { n: "" };

    switch (tr.type) {
      case TransactionType.CHECKIN:
        icon = starOutlineSvg;
        lKey = "checkin";
        break;
      case TransactionType.LOGIN:
        icon = accountOutlineSvg;
        lKey = "login";
        break;
      case TransactionType.CHECKIN_EXTRA:
        icon = checkAllSvg;
        lKey = "checkin-extra";
        break;
      case TransactionType.POST:
        icon = pencilOutlineSvg;
        lKey = "post";
        break;
      case TransactionType.COMMENT:
        icon = commentSvg;
        lKey = "comment";
        break;
      case TransactionType.VOTE:
        icon = chevronUpSvg;
        lKey = "vote";
        break;
      case TransactionType.REBLOG:
        icon = repeatSvg;
        lKey = "reblog";
        break;
      case TransactionType.DELEGATION:
        icon = ticketSvg;
        lKey = "delegation";
        break;
      case TransactionType.REFERRAL:
        icon = gpsSvg;
        lKey = "referral";
        break;
      case TransactionType.COMMUNITY:
        icon = accountGroupSvg;
        lKey = "community";
        break;
      case TransactionType.TRANSFER_SENT:
        icon = compareHorizontalSvg;
        lKey = "transfer-sent";
        lArgs.n = tr.receiver!;
        break;
      case TransactionType.TRANSFER_INCOMING:
        icon = compareHorizontalSvg;
        lKey = "transfer-incoming";
        lArgs.n = tr.sender!;
        break;
      case TransactionType.MINTED:
        icon = cashSvg;
        break;
      default:
    }

    const dateRelative = dateToFullRelative(tr.created);

    return (
      <div className="transaction-list-item">
        <div className="transaction-icon">{icon}</div>
        <div className="transaction-title">
          <div className="transaction-name">{`Point for ${tr.operationType}`}</div>
          <div className="transaction-date">{dateToFullRelative(tr.timestamp)}</div>
        </div>
        {/* {tr.memo && (
          <div className="transaction-details user-selectable">{formatMemo(tr.memo, history)}</div>
        )} */}
        <div className="transaction-numbers">{tr.pointsEarned}.000</div>
      </div>
    );
  }
}

interface Props {
  global: Global;
  dynamicProps: DynamicProps;
  history: History;
  activeUser: ActiveUser | null;
  account: Account | any;
  signingKey: string;
  transactions: Transactions;
  updateWalletValues: () => void;
  addAccount: (data: Account) => void;
  updateActiveUser: (data?: Account) => void;
  setSigningKey: (key: string) => void;
}

interface State {
  claiming: boolean;
  purchase: boolean;
  promote: boolean;
  boost: boolean;
  transfer: boolean;
  estimatedPointsValue: number;
  estimatedPointsValueLoading: boolean;
}

export const ExternalWallet = (props: Props) => {
  const [walletInfo, setWalletInfo] = useState<any[]>([]);
  const [isExternal, setIsExternal] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [wallets, setWallets] = useState<any>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [showSendModal, setShowSendModal] = useState(false);

  const { global, activeUser, account } = props;
  const isMyPage = activeUser && activeUser.username === account.name;

  // Fetch wallets when tokens become available
  useEffect(() => {
    const fetchWallets = async () => {
      if (!account?.profile?.tokens) return;
      console.log("object...account", account);
      try {
        const data = await getWalletInfo(account.profile.tokens);
        setWalletInfo(data.wallets || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWallets();
  }, [account?.profile?.tokens]);

  const handleGenerate = async () => {
    try {
      const res: any = await generateMnemonic();
      setMnemonic(res?.mnemonic || res?.data?.mnemonic || "");
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyAndDerive = async () => {
    try {
      const res: any = await deriveAddresses(mnemonic);
      const w = res?.wallets || res?.data?.wallets || [];
      setWallets(w);
    } catch (err) {
      console.error(err);
    }
  };

  const saveUserWalletToHive = async (username: string, wallets: any) => {
    const tokens = buildHiveWalletTokens(wallets);
    const result = await updateHiveMetadataWithKeychain(username, tokens);
    console.log("Hive updated:", result);
  };

  return (
    <div className="wallet-ecency">
      <div className="wallet-main">
        {account?.profile?.tokens && walletInfo.length > 0 ? (
          <div className="coin-wrapper">
            {walletInfo.map((token: any) => (
              <div className="token-card" key={token.symbol}>
                <div className="token-info">
                  <div className="token-image-info">
                    <img src={token.imageUrl} alt={token.symbol} className="token-logo" />
                    <span className="token-name">{token.symbol}</span>
                  </div>
                  <div className="token-stat">
                    <span>{token.price.toFixed(2)}</span>
                    <span style={{ color: token.change24h >= 1 ? "green" : "red" }}>
                      ({token.change24h.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="token-balance">{token.balance.toFixed(3)}</div>

                <div className="token-address">
                  <span>{token.address.slice(0, 23)}...</span>
                  <span>copy</span>
                </div>

                <div className="ext-btn-wrapper">
                  <button
                    className="send-btn"
                    onClick={() => {
                      setSelectedToken(token);
                      setShowReceiveModal(true);
                    }}
                  >
                    Receive
                  </button>

                  <button
                    className="send-btn"
                    disabled={true}
                    style={{ cursor: "not-allowed" }}
                    onClick={() => {
                      setSelectedToken(token);
                      setShowSendModal(true);
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : !isExternal ? (
          <div className="coin-wrapper">
            {isMyPage ? (
              <Button onClick={() => setIsExternal(true)}>Click to add wallet</Button>
            ) : (
              <p>No external wallet added yet for this account</p>
            )}
          </div>
        ) : null}

        {isExternal && (
          <ExternalWalletSetUp
            setisExternal={setIsExternal}
            generateMnemonic={handleGenerate}
            mnemonic={mnemonic}
            setMnemonic={setMnemonic}
            handleDerive={handleVerifyAndDerive}
            wallets={wallets}
            setWallets={setWallets}
            saveUserWalletToHive={saveUserWalletToHive}
            activeUser={activeUser}
          />
        )}

        <WalletMenu global={global} username={account.name} active="ecency" />
      </div>
      <WalletReceiveModal
        show={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        selectedToken={selectedToken}
      />

      <WalletSendModal
        show={showSendModal}
        onClose={() => setShowSendModal(false)}
        selectedToken={selectedToken}
        onSend={(recipient, amount, memo) => {
          console.log("Send token");
          setShowSendModal(false);
          // Call your send API here
        }}
      />
    </div>
  );
};

export default (p: Props) => {
  const props = {
    global: p.global,
    dynamicProps: p.dynamicProps,
    history: p.history,
    activeUser: p.activeUser,
    account: p.account,
    signingKey: p.signingKey,
    transactions: p.transactions,
    updateWalletValues: p.updateWalletValues,
    addAccount: p.addAccount,
    updateActiveUser: p.updateActiveUser,
    setSigningKey: p.setSigningKey
  };

  return <ExternalWallet {...props} />;
};
