import React, { useEffect, useMemo, useState } from "react";
import { deriveAddresses } from "../../api/external-wallets";
// import { generateMnemonic, deriveAddresses } from "../../api/external-wallets";
import clipboard from "../../util/clipboard";
import "./index.scss";
import { Button } from "@ui/button";

/* token icons */
const TOKEN_ICONS: any = {
  BTC: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  SOL: "https://assets.coingecko.com/coins/images/325/large/sol-logo.png",
  TRON: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
  BNB: "https://cdn.dribbble.com/userupload/43073794/file/original-e23b619cd2fb9d96b1035a7224546f45.jpg?resize=400x0",
  APTOS:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQo-QpHAdPqO2fRTNaInm3BC9EJ6alO84heYA&s"
};

const STAGE = {
  BACKUP: "backup", // show seed & force copy/download
  VERIFY: "verify", // user must re-enter 3 words
  DONE: "done" // derive and show wallets
};

export const ExternalWalletSetUp = (props: any) => {
  const {
    setisExternal,
    generateMnemonic,
    mnemonic,
    setMnemonic,
    wallets,
    setWallets,
    handleDerive,
    saveUserWalletToHive,
    activeUser
  } = props;
  // const [mnemonic, setMnemonic] = useState("");
  const [stage, setStage] = useState(STAGE.BACKUP);
  const [loading, setLoading] = useState(false);
  // const [wallets, setWallets] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [isDownloadedOrCopied, setIsDownloadedOrCopied] = useState(false);

  // verification state
  const words = useMemo(() => mnemonic.trim().split(/\s+/), [mnemonic]);
  const [verifyIndexes, setVerifyIndexes] = useState<any>([]); // e.g. [2, 7, 11]
  const [verifyInputs, setVerifyInputs] = useState<any>({});

  // pick 3 random distinct indexes (1-based for user display)
  function pickThreeIndexes() {
    if (!words || words.length === 0) return [];
    const idxs = new Set();
    const max = words.length;
    while (idxs.size < 3) {
      const i = Math.floor(Math.random() * max) + 1; // 1..max
      idxs.add(i);
    }
    return Array.from(idxs).sort((a: any, b: any) => a - b);
  }

  useEffect(() => {
    // when mnemonic changes, reset verification
    setVerifyInputs({});
    setVerifyIndexes([]);
    setWallets(null);
    setError(null);
    setStage(STAGE.BACKUP);
  }, [mnemonic]);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res: any = await generateMnemonic();
      // if (res?.mnemonic || res?.data?.mnemonic) {
      // support both {mnemonic} or {data: {mnemonic}}
      // const m = res.mnemonic || res.data.mnemonic;
      // setMnemonic(m);
      // pick words for verification after a short delay so words array updates
      // setTimeout(() => setVerifyIndexes(pickThreeIndexes()), 50);
      setStage(STAGE.BACKUP);
      // } else {
      //   throw new Error("Invalid mnemonic response");
      // }
    } catch (err) {
      console.error(err);
      setError("Failed to generate mnemonic");
    } finally {
      setLoading(false);
    }
  };

  // Copy seed phrase safely
  const handleCopy = async () => {
    clipboard(mnemonic);
    setIsDownloadedOrCopied(true);
  };

  // Download wallets JSON safely
  const handleDownload = () => {
    if (!mnemonic && !wallets) return;

    // Determine content to download
    const content = wallets ? JSON.stringify(wallets, null, 2) : mnemonic;

    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = wallets ? "wallets.json" : "seed-phrase.txt";
    document.body.appendChild(a); // append to body
    a.click();
    a.remove(); // remove after clicking
    URL.revokeObjectURL(url); // clean up
    setIsDownloadedOrCopied(true);
  };

  const startVerify = () => {
    if (!mnemonic) {
      setError("No mnemonic to verify");
      return;
    }
    // ensure verifyIndexes is set
    const idxs = verifyIndexes.length ? verifyIndexes : pickThreeIndexes();
    setVerifyIndexes(idxs);
    setVerifyInputs({});
    setStage(STAGE.VERIFY);
  };

  const onVerifyInputChange = (index: any, value: any) => {
    setVerifyInputs((prev: any) => ({ ...prev, [index]: value.trim() }));
  };

  const checkVerification = () => {
    // verify the 3 words selected
    for (const idx of verifyIndexes) {
      const expected = words[idx - 1]; // idx is 1-based
      const given: any = (verifyInputs[idx] || "").trim();
      if (!given || given !== expected) {
        return false;
      }
    }
    return true;
  };

  const handleVerifyAndDerive = async () => {
    setError(null);
    if (!checkVerification()) {
      setError("Verification failed: one or more words are incorrect.");
      return;
    }

    // move to derive stage + call backend
    setLoading(true);
    try {
      const res = await handleDerive();
      console.log("wallets...res,", res);
      // support both res.wallets and res.data.wallets
      // const w = res?.wallets ?? res?.data?.wallets ?? (res?.success && res);
      // if (!w) {
      //   setError("Invalid response from derive API");
      //   setLoading(false);
      //   return;
      // }
      // setWallets(w);
      setStage(STAGE.DONE);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Derive failed");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setMnemonic("");
    setWallets(null);
    setVerifyInputs({});
    setVerifyIndexes([]);
    setError(null);
    setStage(STAGE.BACKUP);
  };

  return (
    <div className="page">
      <div className="container">
        <header className="external-wallets-header">
          <h1 className="title">Breakaway Wallet Onboarding</h1>
          {/* <span className="backend-note">Backend: http://localhost:4000</span> */}
        </header>

        {/* BACKUP STAGE */}
        {stage === STAGE.BACKUP && (
          <section className="card coin-wrappe">
            <h2>Create / Restore</h2>

            <div className="form-grid">
              <div className="mnemonic-box">
                <label>Seed phrase</label>
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  rows={3}
                  className="mnemonic-input"
                  placeholder="Click 'Generate' to create a new mnemonic or paste an existing one"
                />
                <p className="hint">
                  Keep this phrase secret. Anyone with it can access your funds.
                </p>
              </div>

              <div className="mnemonic-buttons">
                <button className="btn primary" onClick={handleGenerate} disabled={loading}>
                  {loading ? "Generating..." : "Generate Mnemonic"}
                </button>

                <button className="btn outline" onClick={handleCopy} disabled={!mnemonic}>
                  Copy Seed
                </button>

                <button className="btn outline" onClick={handleDownload} disabled={!mnemonic}>
                  Download Seed
                </button>

                <button
                  className="btn success"
                  onClick={startVerify}
                  disabled={!isDownloadedOrCopied}
                >
                  I have securely saved my seed — Verify
                </button>

                <button className="btn" onClick={resetAll}>
                  Reset
                </button>
              </div>
            </div>

            {error && <p className="error-msg">Error: {error}</p>}
            <p className="warning">
              Warning: Never paste production mnemonics on untrusted devices.
            </p>
          </section>
        )}

        {/* VERIFY STAGE */}
        {stage === STAGE.VERIFY && (
          <section className="card coin-wrappe">
            <h2>Verify Seed - Confirm 3 words</h2>
            <p className="verify-instructions">
              Please enter the words that correspond to the positions shown below.
            </p>

            <div className="verify-grid">
              {verifyIndexes.map((idx: any) => (
                <div className="verify-row" key={idx}>
                  <label>Word #{idx}</label>
                  <input
                    type="text"
                    value={verifyInputs[idx] || ""}
                    onChange={(e) => onVerifyInputChange(idx, e.target.value)}
                    placeholder={`Enter word #${idx}`}
                  />
                </div>
              ))}
            </div>

            <div className="verify-actions">
              <button className="btn primary" onClick={handleVerifyAndDerive} disabled={loading}>
                {loading ? "Deriving..." : "Verify & Derive Wallets"}
              </button>

              <button
                className="btn outline"
                onClick={() => {
                  // let user re-generate which indexes to verify if they want
                  setVerifyIndexes(pickThreeIndexes());
                  setVerifyInputs({});
                  setError(null);
                }}
              >
                Pick different words
              </button>

              <button className="btn" onClick={() => setStage(STAGE.BACKUP)}>
                Back
              </button>
            </div>

            {error && <p className="error-msg">Error: {error}</p>}
          </section>
        )}

        {/* DONE: show wallets */}
        {stage === STAGE.DONE && wallets && (
          <section className="card coin-wrapper">
            <div className="wallet-header">
              <h2>Derived Wallets</h2>
              <div className="wallet-actions">
                {/* <button className="btn outline" onClick={() => navigator.clipboard.writeText(wallets.mnemonic || mnemonic)}>
                  Copy Mnemonic
                </button> */}
                <button
                  className="btn primary"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(wallets, null, 2)], {
                      type: "application/json"
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "wallets.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export JSON
                </button>
              </div>
            </div>

            <div className="wallet-grid">
              {Object.keys(wallets)
                .filter((k) => k !== "mnemonic")
                .map((chain) => {
                  const w: any = wallets[chain];
                  if (!w) return null;
                  return (
                    <div className="wallet-card" key={chain}>
                      <div className="set-up-wallet-info">
                        <img src={w.imageUrl} alt={chain} />
                        <div className="wallet-details">
                          <h3>{chain}</h3>
                          <p className="wallet-address">
                            <strong>Address:</strong> {w.address}
                          </p>
                          <div className="wallet-button">
                            <button
                              className="btn outline"
                              onClick={() => navigator.clipboard.writeText(w.address || "")}
                            >
                              Copy Address
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ marginTop: 18 }}>
              <Button
                onClick={() => {
                  saveUserWalletToHive(activeUser?.username, wallets);
                  setisExternal(false);
                }}
                className="mt-5"
              >
                Proceed
              </Button>
              <button
                className="btn"
                onClick={() => {
                  setStage(STAGE.BACKUP);
                  setWallets(null);
                }}
              >
                Back to start
              </button>
            </div>
          </section>
        )}

        <footer className="footer">Connect hive account to other blockchains.</footer>
      </div>
    </div>
  );
};
