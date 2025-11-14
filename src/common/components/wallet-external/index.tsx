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
  account: Account;
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
  const [tokens] = useState([
    {
      name: "Bitcoin",
      symbol: "Btc",
      logo: "https://www.shutterstock.com/image-vector/bitcoin-logo-bright-orange-color-600nw-2650281747.jpg",
      balance: 0.532,
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    },
    {
      name: "Ethereum",
      symbol: "Eth",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzpOeejeflUbdeY5CMy6nSFg4F1zJfKqm9eQ&s",
      balance: 152.44,
      address: "hive1234567890abc"
    },
    {
      name: "Solana",
      symbol: "Sol",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTOOhDi1KrwwS7G_H1yvSkMoiPhO3anGP8_w&s",
      balance: 89.22,
      address: "hbd987654321"
    },
    {
      name: "TON",
      symbol: "Ton",
      logo: "https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/logos/ton-n6irzxxx7vrdcd9gb6gbbv.png/ton-gib1fdan9k9u3ii01dvg5.png?_a=DATAg1AAZAA0",
      balance: 89.22,
      address: "hbd987654321"
    },
    {
      name: "TRX",
      symbol: "trx",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBsWaz0K2kxYpSFMhQ2pPdBcnOwpQHWYEyzw&s",
      balance: 89.22,
      address: "hbd987654321"
    },
    {
      name: "Binance coin",
      symbol: "Bnb",
      logo: "https://cdn.dribbble.com/userupload/43073794/file/original-e23b619cd2fb9d96b1035a7224546f45.jpg?resize=400x0",
      balance: 89.22,
      address: "hbd987654321"
    },
    {
      name: "APTOS",
      symbol: "Aptos",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQo-QpHAdPqO2fRTNaInm3BC9EJ6alO84heYA&s",
      balance: 89.22,
      address: "hbd987654321"
    },
    {
      name: "POLYGON",
      symbol: "Matc",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-UjZYpTKlVQWhKF3Sf3camP-rCTZ_OZnqcA&s",
      balance: 89.22,
      address: "hbd987654321"
    }
  ]);

  const { global, activeUser, account, history, updateActiveUser } = props;

  // const isMyPage = activeUser && activeUser.username === account.name;

  const isMyPage = activeUser && activeUser.username === account.name;

  return (
    <>
      <div className="wallet-ecency">
        <div className="wallet-main">
          <div className="coin-wrapper">
            {tokens.map((token) => (
              <div className="token-card" key={token.symbol}>
                <div className="token-info">
                  <img src={token.logo} alt={token.name} className="token-logo" />
                  <div>
                    <div className="token-name">{token.name}</div>
                    <div className="token-symbol">{token.symbol}</div>
                  </div>
                </div>

                <div className="token-balance">{token.balance.toFixed(3)}</div>

                <div className="token-address">
                  <span>{token.address.slice(0, 10)}...</span>
                  copy
                </div>

                <button className="send-btn">Send</button>
              </div>
            ))}
          </div>

          <WalletMenu global={global} username={account.name} active="ecency" />
        </div>
      </div>
    </>
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
