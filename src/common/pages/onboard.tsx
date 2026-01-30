import React, { useEffect, useState } from "react";
import { match } from "react-router";
import { PrivateKey } from "@hiveio/dhive";
import { Link } from "react-router-dom";

import Meta from "../components/meta";
import { connect } from "react-redux";
import Theme from "../components/theme";
import NavBar from "../components/navbar";
import Feedback, { error, success } from "../components/feedback";
import Tooltip from "../components/tooltip";
import LinearProgress from "../components/linear-progress";
import keyOrHot from "../components/key-or-hot";

import { FullAccount } from "../store/accounts/types";
import { pageMapDispatchToProps, pageMapStateToProps, PageProps } from "./common";
import {
  createAccountHs,
  createAccountKc,
  createAccountKey,
  createAccountWithCreditHs,
  createAccountWithCreditKc,
  createAccountWithCreditKey,
  delegateRC
} from "../api/operations";
import { onboardEmail } from "../api/private-api";
import { generatePassword, getPrivateKeys } from "../helper/onBoard-helper";
import { b64uDec, b64uEnc } from "../util/b64";
import clipboard from "../util/clipboard";

import { copyContent, downloadSvg, regenerateSvg } from "../img/svg";
import { _t } from "../i18n";
import "./onboard.scss";
import { Modal, ModalBody, ModalHeader, ModalTitle } from "@ui/modal";
import { Button } from "@ui/button";
import { FormControl, InputGroup } from "@ui/input";
import { getRcOperationStats } from "../api/hive";
import { Alert } from "@ui/alert";
import QRCode from "react-qr-code";
import { getInvoice, getLightning, getAccountStatus } from "../api/breakaway";
import OrDivider from "../components/or-divider";
import { ExternalWallet } from "../components/wallet-external";
import { ExternalWalletSetUp } from "../components/set-up-external-wallet";
import { deriveAddresses, generateMnemonic } from "../api/external-wallets";
import { buildHiveWalletTokens } from "../helper/external-wallet";
import { updateHiveMetadataWithKeychain } from "../api/operations";

export interface AccountInfo {
  email: string;
  username: string;
  referral: string;
  keys: {
    active?: string;
    activePubkey: string;
    memo?: string;
    memoPubkey: string;
    owner?: string;
    ownerPubkey: string;
    posting?: string;
    postingPubkey: string;
  };
}

export interface DecodeHash {
  email: string;
  username: string;
  pubkeys: {
    ownerPublicKey: string;
    activePublicKey: string;
    postingPublicKey: string;
    memoPublicKey: string;
  };
}

export interface ConfirmDetails {
  label: string;
  value: string;
}

const createOptions = {
  HIVE: "hive",
  CREDIT: "credit"
};

interface MatchParams {
  secret?: string;
  type: string;
  id: string;
}

interface Props extends PageProps {
  match: match<MatchParams>;
}

const Onboard = (props: Props) => {
  const [masterPassword, setMasterPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [accountInfo, setAccountInfo] = useState<AccountInfo>();
  const [decodedInfo, setDecodedInfo] = useState<DecodeHash>();
  const [showModal, setShowModal] = useState(false);
  const [accountCredit, setAccountCredit] = useState(0);
  const [createOption, setCreateOption] = useState("");
  const [fileIsDownloaded, setFileIsDownloaded] = useState(false);
  const [innerWidth, setInnerWidth] = useState(0);
  const [shortPassword, setShortPassword] = useState("");
  const [confirmDetails, setConfirmDetails] = useState<ConfirmDetails[]>();
  const [onboardUrl, setOnboardUrl] = useState("");
  const [step, setStep] = useState<string | number>(0);
  const [inProgress, setInprogress] = useState(false);
  const [rcAmount, setRcAmount] = useState(0);
  const [isChecked, setChecked] = useState(false);
  const [rcError, setRcError] = useState("");
  const [commentAmount, setCommentAmount] = useState(0);
  const [voteAmount, setVoteAmount] = useState(0);
  const [transferAmount, setTransferAmount] = useState(0);
  const [customJsonAmount, setCustomJsonAmount] = useState(0);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [status, setStatus] = useState<
    "checking" | "pending" | "paid" | "account_created" | "notfound"
  >("checking");
  const [isExternal, setisExternal] = useState<any>(true);
  const [mnemonic, setMnemonic] = useState("");
  const [wallets, setWallets] = useState<any>(null);

  useEffect(() => {
    setOnboardUrl(`${window.location.origin}/onboard-friend/creating/`);
    setInnerWidth(window.innerWidth);
    try {
      if (props.match.params.secret && props.match.params.type !== "asking") {
        const decodedHash = JSON.parse(b64uDec(props.match.params.secret));
        setDecodedInfo(decodedHash);
      }
    } catch (err) {
      console.log(err);
    }
  }, []);

  useEffect(() => {
    if (props.match.params.type == "asking" || props.match.params.type == "creating") {
      initAccountKey();
    }
    // console.log(accountInfo?.username);
  }, [accountInfo?.username]);

  useEffect(() => {
    const { activeUser } = props;
    (activeUser?.data as FullAccount) &&
      (activeUser?.data as FullAccount).pending_claimed_accounts &&
      setAccountCredit((activeUser?.data as FullAccount).pending_claimed_accounts);
    console.log("active user......", activeUser);
  }, [props.activeUser]);

  useEffect(() => {
    // console.log("decodedInfo..", decodedInfo)
    if (accountInfo) {
      setConfirmDetails([
        { label: _t("onboard.username"), value: formatUsername(accountInfo!?.username) },
        { label: _t("onboard.public-owner"), value: accountInfo?.keys?.ownerPubkey },
        { label: _t("onboard.public-active"), value: accountInfo?.keys?.activePubkey },
        { label: _t("onboard.public-posting"), value: accountInfo?.keys?.postingPubkey },
        { label: _t("onboard.public-memo"), value: accountInfo?.keys?.memoPubkey }
      ]);
    }
  }, [accountInfo]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [masterPassword]);

  useEffect(() => {
    rcOperationsCost();
  }, [rcAmount]);

  useEffect(() => {
    if (!isChecked) {
      setRcAmount(0);
    }
  }, [isChecked]);

  useEffect(() => {
    if (!decodedInfo?.username) return;

    const interval = setInterval(async () => {
      try {
        const res = await getAccountStatus(decodedInfo?.username);

        if (res.status === "pending") {
          setStatus(res.status || "pending");
        } else if (res.status === "account_created") {
          setStatus("account_created");
          clearInterval(interval); // stop polling once done
        }
        // }
      } catch (err) {
        console.error("Error checking account status:", err);
      }
    }, 1000); // check every 5s

    return () => clearInterval(interval);
  }, [decodedInfo]);

  const handleGenerate = async () => {
    try {
      const res: any = await generateMnemonic();
      if (res?.mnemonic || res?.data?.mnemonic) {
        const m = res.mnemonic || res.data.mnemonic;
        setMnemonic(m);
      } else {
        throw new Error("Invalid mnemonic response");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyAndDerive = async () => {
    try {
      const res = await deriveAddresses(mnemonic);
      // support both res.wallets and res.data.wallets
      const w = res?.wallets ?? res?.data?.wallets ?? (res?.success && res);
      console.log("wallets....", w);

      setWallets(w);
    } catch (err: any) {
      console.error(err);
    }
  };

  const saveUserWalletToHive = async (username: any, wallets: any) => {
    const tokens = buildHiveWalletTokens(wallets);
    const result = await updateHiveMetadataWithKeychain(username, tokens);
    console.log("Hive updated:", result);
  };

  const handleResize = () => {
    setInnerWidth(window.innerWidth);
    let password: string = "";
    if (window.innerWidth <= 768 && window.innerWidth > 577) {
      password = masterPassword.substring(0, 32);
    } else if (window.innerWidth <= 577) {
      password = masterPassword.substring(0, 20);
    }
    setShortPassword(password);
  };

  const initAccountKey = async () => {
    const urlInfo = props.match.params.secret;
    try {
      const info = JSON.parse(b64uDec(urlInfo!));
      const masterPassword: string = await generatePassword(32);
      const keys: AccountInfo["keys"] = getPrivateKeys(
        formatUsername(info?.username),
        masterPassword
      );
      // prepare object to encode
      const pubkeys = {
        activePublicKey: keys.activePubkey,
        memoPublicKey: keys.memoPubkey,
        ownerPublicKey: keys.ownerPubkey,
        postingPublicKey: keys.postingPubkey
      };

      const dataToEncode = {
        username: info.username,
        email: info.email,
        pubkeys
      };
      // stringify object to encode
      const stringifiedData = JSON.stringify(dataToEncode);
      const hashedPubKeys = b64uEnc(stringifiedData);
      setSecret(hashedPubKeys);
      const accInfo = {
        username: formatUsername(info.username),
        email: formatEmail(info.email),
        referral: formatUsername(info.referral),
        keys
      };

      // console.log("object...", accInfo);
      setAccountInfo(accInfo);
      setMasterPassword(masterPassword);
      return masterPassword;
    } catch (err: any) {
      error(err?.message);
      return null;
    }
  };

  const sendMail = async () => {
    const { activeUser } = props;
    const username = decodedInfo!?.username || accountInfo!?.username;
    const email = decodedInfo!.email || accountInfo!.email;
    if (activeUser) {
      await onboardEmail(formatUsername(username), formatEmail(email), activeUser?.username);
    }
  };

  const splitUrl = (url: string) => {
    return url.slice(0, 50);
  };

  const getLightningAcc = async () => {
    try {
      // console.log("object...", accountInfo);
      const invoiceData = await getInvoice(
        setInvoiceData,
        accountInfo?.username || decodedInfo!?.username
      );

      const data = {
        username: decodedInfo!?.username || accountInfo?.username,
        accountKeys: {
          ownerPubkey: decodedInfo?.pubkeys?.ownerPublicKey || accountInfo?.keys?.ownerPubkey,
          activePubkey: decodedInfo?.pubkeys?.activePublicKey || accountInfo?.keys?.activePubkey,
          postingPubkey: decodedInfo?.pubkeys?.postingPublicKey || accountInfo?.keys?.postingPubkey,
          memoPubkey: decodedInfo?.pubkeys?.memoPublicKey || accountInfo?.keys?.memoPubkey
        },
        token: "HIVE",
        payment_addr: invoiceData?.payment_addr,
        payment_hash: invoiceData?.payment_hash,
        payment_request: invoiceData?.payment_request,
        r_hash: invoiceData?.r_hash,
        v4vMemo: invoiceData?.memo,
        satsAmount: invoiceData?.amount
      };

      const getAcc = await getLightning(data);
      console.log("lightning acc created:", getAcc);
    } catch (error) {
      console.error("error creating lightning acc:", error);
    }
  };

  const downloadKeys = async () => {
    if (accountInfo) {
      setFileIsDownloaded(false);
      const { username, keys } = accountInfo;
      const element = document.createElement("a");
      const keysToFile = `
          ${_t("onboard.file-warning")}
  
          ${_t("onboard.recommend")}
          1. ${_t("onboard.recommend-print")}
          2. ${_t("onboard.recommend-use")}
          3. ${_t("onboard.recommend-save")}
          4. ${_t("onboard.recommend-third-party")}

          ${_t("onboard.account-info")}

          Username: ${username}

          Password: ${masterPassword}

          ${_t("onboard.owner-private")} ${keys.owner}
  
          ${_t("onboard.active-private")} ${keys.active}
  
          ${_t("onboard.posting-private")} ${keys.posting}
  
          ${_t("onboard.memo-private")} ${keys.memo}
  
  
          ${_t("onboard.keys-use")}
          ${_t("onboard.owner")} ${_t("onboard.owner-use")}   
          ${_t("onboard.active")} ${_t("onboard.active-use")}  
          ${_t("onboard.posting")} ${_t("onboard.posting-use")} 
          ${_t("onboard.memo")} ${_t("onboard.memo-use")}`;

      const file = new Blob([keysToFile.replace(/\n/g, "\r\n")], {
        type: "text/plain"
      });
      element.href = URL.createObjectURL(file);
      element.download = `${username}_hive_keys.txt`;
      document.body.appendChild(element);
      element.click();
      setFileIsDownloaded(true);
    }
  };

  const formatUsername = (username: string) => {
    return username?.replace(/\+/g, "-").replace(/=/g, ".");
  };

  const formatEmail = (username: string) => {
    return username?.replace(/\+/g, "-").replace(/=/g, ".").replace(/\//g, "_");
  };

  const onKc = async (type: string) => {
    // console.log("onboarding username....... decodedInfo...", decodedInfo)
    const { activeUser, dynamicProps } = props;

    const accountKeys: any = {
      ownerPubkey: decodedInfo?.pubkeys?.ownerPublicKey || accountInfo?.keys?.ownerPubkey,
      activePubkey: decodedInfo?.pubkeys?.activePublicKey || accountInfo?.keys?.activePubkey,
      postingPubkey: decodedInfo?.pubkeys?.postingPublicKey || accountInfo?.keys?.postingPubkey,
      memoPubkey: decodedInfo?.pubkeys?.memoPublicKey || accountInfo?.keys?.memoPubkey
    };
    if (activeUser) {
      try {
        if (type === createOptions.HIVE) {
          const resp = await createAccountKc(
            {
              username: formatUsername(accountInfo!?.username),
              pub_keys: accountKeys,
              fee: dynamicProps.accountCreationFee
            },
            activeUser?.username
          );
          if (resp.success == true) {
            setInprogress(false);
            setStep("success");
            sendMail();
            if (isChecked) {
              await delegateRC(
                activeUser?.username,
                formatUsername(accountInfo!?.username),
                rcAmount * 1e9
              );
            }
          } else {
            setStep("failed");
          }
        } else {
          const resp = await createAccountWithCreditKc(
            {
              username: formatUsername(accountInfo!?.username),
              pub_keys: accountKeys
            },
            activeUser?.username
          );
          if (resp.success == true) {
            setInprogress(false);
            setStep("success");
            // await saveUserWalletToHive(accountInfo!?.username, wallets)
            sendMail();
            if (isChecked) {
              await delegateRC(
                activeUser?.username,
                formatUsername(accountInfo!?.username),
                rcAmount * 1e9
              );
            }
          } else {
            setStep("failed");
          }
        }
      } catch (err: any) {
        if (err) {
          setStep("failed");
        }
        error(err.message);
      }
    }
  };

  const onKey = async (type: string, key: PrivateKey) => {
    const { activeUser, dynamicProps } = props;
    if (activeUser) {
      try {
        if (type === createOptions.HIVE) {
          const resp = await createAccountKey(
            {
              username: formatUsername(decodedInfo!.username),
              pub_keys: decodedInfo?.pubkeys,
              fee: dynamicProps.accountCreationFee
            },
            activeUser?.username,
            key
          );
          if (resp.id) {
            setInprogress(false);
            setStep("success");
            sendMail();
            if (isChecked) {
              await delegateRC(
                activeUser?.username,
                formatUsername(decodedInfo!.username),
                rcAmount * 1e9
              );
            }
          } else {
            setStep("failed");
          }
        } else {
          const resp = await createAccountWithCreditKey(
            {
              username: formatUsername(decodedInfo!.username),
              pub_keys: decodedInfo?.pubkeys
            },
            activeUser?.username,
            key
          );
          if (resp.id) {
            setInprogress(false);
            setStep("success");
            sendMail();
            if (isChecked) {
              await delegateRC(
                activeUser?.username,
                formatUsername(decodedInfo!.username),
                rcAmount * 1e9
              );
            }
          } else {
            setStep("failed");
          }
        }
      } catch (err: any) {
        if (err) {
          setStep("failed");
        }
        error(err.message);
      }
    }
  };

  const onHot = async (type: string) => {
    const { activeUser, dynamicProps } = props;
    const dataToEncode = {
      username: formatUsername(decodedInfo!.username),
      email: formatEmail(decodedInfo!.email)
    };
    const stringifiedData = JSON.stringify(dataToEncode);
    const hashedInfo = b64uEnc(stringifiedData);
    if (activeUser) {
      try {
        if (type === createOptions.HIVE) {
          const resp = await createAccountHs(
            {
              username: formatUsername(decodedInfo!.username),
              pub_keys: decodedInfo?.pubkeys,
              fee: dynamicProps.accountCreationFee
            },
            activeUser?.username,
            hashedInfo
          );
          if (resp) {
            setInprogress(false);
            setShowModal(false);
            if (isChecked) {
              await delegateRC(
                activeUser?.username,
                formatUsername(decodedInfo!.username),
                rcAmount * 1e9
              );
            }
            // sendMail();
          }
        } else {
          const resp = await createAccountWithCreditHs(
            {
              username: formatUsername(decodedInfo!.username),
              pub_keys: decodedInfo?.pubkeys
            },
            activeUser?.username,
            hashedInfo
          );
          if (resp) {
            setInprogress(false);
            setShowModal(false);
            if (isChecked) {
              await delegateRC(
                activeUser?.username,
                formatUsername(decodedInfo!.username),
                rcAmount * 1e9
              );
            }
            // sendMail();
          }
        }
      } catch (err: any) {
        if (err) {
          setShowModal(false);
        }
        error(err.message);
      }
    }
  };

  const signTransactionModal = (type: string) => {
    return (
      <>
        <div className="border-b border-[--border-color] flex items-center">
          <div className="step-no">2</div>
          <div>
            <div>{_t("onboard.sign-header-title")}</div>
            <div>{_t("onboard.sign-sub-title")}</div>
          </div>
        </div>
        {inProgress && <LinearProgress />}
        {keyOrHot({
          global: props.global,
          activeUser: props.activeUser,
          signingKey: props.signingKey,
          setSigningKey: props.setSigningKey,
          inProgress: inProgress,
          onKey: (key) => {
            onKey(type, key);
          },
          onHot: () => {
            onHot(type);
          },
          onKc: () => {
            onKc(type);
          }
        })}
        <p className="text-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowModal(false);
            }}
          >
            {_t("g.back")}
          </a>
        </p>
      </>
    );
  };

  const rcOperationsCost = async () => {
    const rcStats: any = await getRcOperationStats();
    const operationCosts = rcStats.rc_stats.ops;
    const commentCost = operationCosts.comment_operation.avg_cost;
    const transferCost = operationCosts.transfer_operation.avg_cost;
    const voteCost = operationCosts.vote_operation.avg_cost;
    const customJsonOperationsCosts = operationCosts.custom_json_operation.avg_cost;
    if (Number(rcAmount * 1e9) < 5000000000) {
      setRcError(_t("onboard.rc-error"));
    } else {
      setRcError("");
    }

    const commentCount: number = Math.ceil(Number(rcAmount * 1e9) / commentCost);
    const votetCount: number = Math.ceil(Number(rcAmount * 1e9) / voteCost);
    const transferCount: number = Math.ceil(Number(rcAmount * 1e9) / transferCost);
    const customJsonCount: number = Math.ceil(Number(rcAmount * 1e9) / customJsonOperationsCosts);

    setCommentAmount(commentCount);
    setVoteAmount(votetCount);
    setTransferAmount(transferCount);
    setCustomJsonAmount(customJsonCount);
  };

  const successModalBody = () => {
    return (
      <>
        <div className="create-account-success-dialog-header border-b border-[--border-color] flex">
          <div className="step-no">2</div>
          <div className="create-account-success-dialog-titles">
            <div className="create-account-main-title">{_t("trx-common.success-title")}</div>
            <div className="create-account-sub-title">{_t("trx-common.success-sub-title")}</div>
          </div>
        </div>

        <div className="success-dialog-body">
          <div className="success-dialog-content">
            <span>
              {_t("onboard.success-message")}{" "}
              <strong>{formatUsername(decodedInfo!?.username)}</strong>
            </span>
          </div>
          <div className="flex justify-center">
            <span className="hr-6px-btn-spacer" />
            <Link to={`/@${formatUsername(decodedInfo!?.username)}`}>
              <Button className="mt-3 w-[50%] align-self-center" onClick={finish}>
                {_t("g.finish")}
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  };
  const failedModalBody = () => {
    return (
      <>
        <div className="create-account-success-dialog-header border-b border-[--border-color] flex text-red">
          <div className="step-no">❌</div>
          <div className="create-account-success-dialog-titles">
            <div className="create-account-main-title">{_t("onboard.failed-title")}</div>
            <div className="create-account-sub-title">{_t("onboard.failed-subtitle")}</div>
          </div>
        </div>

        <div className="success-dialog-body">
          <div className="success-dialog-content">
            <span className="text-red">{_t("onboard.failed-message")}</span>
          </div>
          <div className="flex justify-center">
            <span className="hr-6px-btn-spacer" />
            <Button onClick={finish}>{_t("onboard.try-again")}</Button>
          </div>
        </div>
      </>
    );
  };

  const finish = () => {
    setShowModal(false);
    setStep(0);
  };

  return (
    <>
      <Meta title="Onboarding a Friend" />
      <Theme global={props.global} />
      <Feedback activeUser={props.activeUser} />
      <NavBar history={props.history} />

      {isExternal && props.match.params.type !== "asking" ? (
        <div>
          <ExternalWalletSetUp
            setisExternal={setisExternal}
            generateMnemonic={handleGenerate}
            mnemonic={mnemonic}
            setMnemonic={setMnemonic}
            handleDerive={handleVerifyAndDerive}
            saveUserWalletToHive={saveUserWalletToHive}
            wallets={wallets}
            setWallets={setWallets}
          />
        </div>
      ) : (
        <>
          {props.match.params.type === "asking" &&
            props.match.params.secret &&
            (status === "account_created" ? (
              <div className="creating-confirm asking asking-body p-4 text-center">
                <h2 className="align-self-center">✅ Account Created successfully</h2>
                <Link to={`/@${decodedInfo?.username}`} className="align-self-center">
                  Visit @{decodedInfo?.username}'s profile
                </Link>
                <BubbleSprinkle />
              </div>
            ) : (
              <div className="onboard-container">
                <div className="asking">
                  <div
                    className={`asking-body flex mb-0 self-center flex-col ${
                      innerWidth < 577 ? "p-3" : "p-5"
                    }`}
                  >
                    <h3 className="mb-3 self-center text-2xl font-semibold text-blue-dark-sky">
                      {_t("onboard.confirm-details")}
                    </h3>

                    <div className="reg-details">
                      <span style={{ lineHeight: 2 }}>
                        {_t("onboard.username")} <strong>{accountInfo?.username}</strong>
                      </span>
                      <span style={{ lineHeight: 2 }}>
                        {_t("onboard.email")} <strong>{accountInfo?.email}</strong>
                      </span>
                      <span style={{ lineHeight: 2 }}>
                        {_t("onboard.referral")} <strong>{accountInfo?.referral}</strong>
                      </span>
                    </div>

                    <span className="mt-3">{_t("onboard.copy-key")}</span>

                    <div className="mt-3 flex flex-col items-center">
                      <div className="flex">
                        <span className="mr-3 mt-1">
                          {innerWidth <= 768 ? shortPassword + "..." : masterPassword}
                        </span>
                        <Tooltip content={_t("onboard.copy-tooltip")}>
                          <span
                            className="onboard-svg mr-3"
                            onClick={() => {
                              clipboard(masterPassword);
                              success(_t("onboard.copy-password"));
                            }}
                          >
                            {copyContent}
                          </span>
                        </Tooltip>
                        <Tooltip content={_t("onboard.regenerate-password")}>
                          <span className="onboard-svg" onClick={() => initAccountKey()}>
                            {regenerateSvg}
                          </span>
                        </Tooltip>
                      </div>

                      <Button
                        className="self-center mt-3"
                        disabled={!accountInfo?.username}
                        onClick={() => downloadKeys()}
                        icon={downloadSvg}
                      >
                        {_t("onboard.download-keys")}
                      </Button>

                      {fileIsDownloaded && (
                        <>
                          <Alert className="flex flex-col self-center justify-center mt-3">
                            {!props.activeUser ? (
                              <>
                                <h4>{_t("onboard.copy-info-message")}</h4>
                                <div className="flex items-center">
                                  <span>{splitUrl(onboardUrl + secret)}...</span>
                                  <span
                                    style={{ width: "5%" }}
                                    className="onboard-svg"
                                    onClick={() => {
                                      clipboard(onboardUrl + secret);
                                      success(_t("onboard.copy-link"));
                                    }}
                                  >
                                    {copyContent}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <span>
                                <Link to={`/onboard-friend/creating/${secret}`}>
                                  {_t("onboard.click-link")}
                                </Link>
                                {/* <a href={onboardUrl + secret}>{_t("onboard.click-link")}</a> */}
                              </span>
                            )}
                          </Alert>

                          {/* <OrDivider />

                        <div className="qr-section">
                          <h4>Pay with bitcoin lightning</h4>
                          <Button
                            className="align-self-center"
                            onClick={async () => {
                              await getLightningAcc();
                            }}
                          >
                            Click to get lightning QR
                          </Button>
                          {invoiceData && (
                            <>
                              <p>Scan QR to complete payment</p>
                              <QRCode
                                size={256}
                                style={{ height: "300px", width: "300px" }}
                                value={`lightning:${invoiceData?.payment_request}`}
                                viewBox={`0 0 256 256`}
                              />
                            </>
                          )}
                        </div> */}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

          {props.match.params.type === "creating" && props.match?.params?.secret && (
            <div className="onboard-container">
              {props.activeUser ? (
                status === "account_created" ? (
                  <div className="creating-confirm asking asking-body p-4 text-center">
                    <h2 className="align-self-center">✅ Account Created successfully</h2>
                    <Link to={`/@${decodedInfo!.username}`} className="align-self-center">
                      Visit @{decodedInfo!.username}`s profile
                    </Link>
                    <BubbleSprinkle />
                  </div>
                ) : (
                  <div className="creating-confirm asking asking-body p-4">
                    <h3 className="align-self-center text-2xl font-semibold text-blue-dark-sky">
                      {_t("onboard.confirm-details")}
                    </h3>

                    {confirmDetails &&
                      confirmDetails.map((field, index) => (
                        <span key={index}>
                          {field.label}
                          <strong style={{ wordBreak: "break-word", marginLeft: "10px" }}>
                            {field.value}
                          </strong>
                        </span>
                      ))}

                    {/* RC delegation section */}
                    <div className="onboard-delegate-rc">
                      <div className="col-span-12 sm:col-span-10">
                        <div className="onboard-check mb-2">
                          <input
                            type="checkbox"
                            className="onboard-checkbox"
                            checked={isChecked}
                            onChange={() => setChecked(!isChecked)}
                          />
                          <span className="onboard-blinking-text">
                            {_t("onboard.rc-to-new-acc")} {accountInfo?.username}{" "}
                            {_t("onboard.minimum-rc")}
                          </span>
                        </div>

                        {isChecked && (
                          <div className="mt-3">
                            {rcAmount && rcError && (
                              <span className="text-danger mt-3">{rcError}</span>
                            )}
                            <InputGroup>
                              <FormControl
                                type="text"
                                placeholder={"Enter amount to delegate(Bn)"}
                                value={rcAmount}
                                onChange={(e) => setRcAmount(Number(e.target.value))}
                              />
                            </InputGroup>
                            <div className="operation-amount d-flex mt-3">
                              <span className="operations">
                                {_t("onboard.posts-comments")} {commentAmount} |
                              </span>
                              <span className="operations">
                                {_t("onboard.votes")} {voteAmount} |
                              </span>
                              <span className="operations">
                                {_t("onboard.transfers")} {transferAmount} |
                              </span>
                              <span className="operations">
                                {_t("onboard.reblogs-follows")} {customJsonAmount}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment options */}
                    <div className="creating-confirm-bottom">
                      <span>{_t("onboard.pay-fee")}</span>
                      <div className="onboard-btn-container">
                        <Button
                          className="align-self-center"
                          onClick={() => {
                            setCreateOption("hive");
                            setShowModal(true);
                            setStep("sign");
                          }}
                        >
                          {_t("onboard.create-account-hive")}
                        </Button>
                        <Button
                          className="align-self-center"
                          disabled={accountCredit <= 0 || (isChecked && rcError !== "")}
                          onClick={() => {
                            setCreateOption("credit");
                            setShowModal(true);
                            setStep("sign");
                          }}
                        >
                          {_t("onboard.create-account-credit", { n: accountCredit })}
                        </Button>
                      </div>

                      {/* Lightning QR */}
                      <div className="qr-section">
                        <Button
                          className="align-self-center"
                          onClick={async () => {
                            await getLightningAcc();
                          }}
                        >
                          Pay with bitcoin lightning
                        </Button>
                        {invoiceData && (
                          <>
                            <p>Scan QR to complete payment</p>
                            <QRCode
                              size={256}
                              style={{ height: "300px", width: "300px" }}
                              value={`lightning:${invoiceData?.payment_request}`}
                              viewBox={`0 0 256 256`}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="login-warning">{_t("onboard.login-warning")}</div>
              )}
            </div>
          )}

          {props.match.params.type === "confirming" && (
            <div className="onboard-container">
              <div className="login-warning">
                <span>
                  {_t("onboard.success-message")}{" "}
                  <strong>@{formatUsername(decodedInfo!.username)}</strong>
                </span>
              </div>
              <Link to={`/@${formatUsername(decodedInfo!.username)}`}>
                <Button
                  className="mt-3 w-[50%] align-self-center"
                  onClick={() => {
                    const { location } = props;
                    const queryParams = new URLSearchParams(location.search);
                    if (queryParams.has("tid")) {
                      sendMail();
                    }
                  }}
                >
                  {_t("g.finish")}
                </Button>
              </Link>
            </div>
          )}
        </>
      )}

      <Modal
        animation={false}
        show={showModal}
        centered={true}
        onHide={() => setShowModal(false)}
        className="create-account-dialog"
        size="lg"
      >
        <ModalHeader closeButton={true}>
          <ModalTitle />
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col">
            {createOption === createOptions.HIVE && (
              <React.Fragment>
                {step === "sign" && signTransactionModal(createOptions.HIVE)}
                {step === "success" && successModalBody()}
                {step === "failed" && failedModalBody()}
              </React.Fragment>
            )}

            {createOption === createOptions.CREDIT && (
              <React.Fragment>
                {step === "sign" && signTransactionModal(createOptions.CREDIT)}
                {step === "success" && successModalBody()}
                {step === "failed" && failedModalBody()}
              </React.Fragment>
            )}
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

// BubbleSprinkle.tsx
const BubbleSprinkle: React.FC = () => {
  useEffect(() => {
    const container = document.body; // sprinkle across whole page

    for (let i = 0; i < 30; i++) {
      const bubble = document.createElement("div");
      bubble.className = "bubble";

      // random position and size
      bubble.style.left = Math.random() * 100 + "vw";
      bubble.style.width = bubble.style.height = 10 + Math.random() * 20 + "px";

      // random animation duration
      bubble.style.animationDuration = 3 + Math.random() * 2 + "s";

      container.appendChild(bubble);

      // cleanup after animation
      setTimeout(() => bubble.remove(), 5000);
    }
  }, []);

  return null;
};

export default connect(pageMapStateToProps, pageMapDispatchToProps)(Onboard);
