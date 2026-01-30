import React from "react";
import QRCode from "react-qr-code";
import "./index.scss"; // we'll write the CSS below
import { success } from "../feedback";

interface WalletReceiveModalProps {
  show: boolean;
  onClose: () => void;
  selectedToken: any;
}

export const WalletReceiveModal: React.FC<WalletReceiveModalProps> = ({
  show,
  onClose,
  selectedToken
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(selectedToken.address).then(() => {
      success("Address copied to clipboard!");
    });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h3 className="modal-title">Receive {selectedToken.symbol}</h3>
        <span className="modal-title">Please send only {selectedToken.symbol} to this address</span>
        <div className="qr-wrapper">
          <QRCode size={180} value={selectedToken.address} viewBox={`0 0 256 256`} />
          {selectedToken?.imageUrl && (
            <img
              src={selectedToken.imageUrl}
              alt={selectedToken.symbol}
              className="qr-center-logo"
            />
          )}
        </div>
        <div className="wallet-address">
          <span>{selectedToken.address}</span>
          <button className="copy-btn" onClick={copyToClipboard}>
            Copy
          </button>
        </div>
      </div>
    </div>
  );
};
