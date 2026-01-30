import React, { useState } from "react";
import "./index.scss";

interface WalletSendModalProps {
  show: boolean;
  onClose: () => void;
  selectedToken: any;
  onSend: (recipient: string, amount: number, memo?: string) => void;
}

export const WalletSendModal: React.FC<WalletSendModalProps> = ({
  show,
  onClose,
  selectedToken,
  onSend
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [memo, setMemo] = useState("");

  if (!show) return null;

  const handleSend = () => {
    if (!recipient || !amount) {
      alert("Please enter recipient and amount.");
      return;
    }
    onSend(recipient, Number(amount), memo);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h3 className="modal-title">Send {selectedToken.symbol}</h3>

        <div className="modal-field">
          <label>Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter recipient address"
          />
        </div>

        <div className="modal-field">
          <label>Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Enter amount"
          />
        </div>

        <div className="modal-field">
          <label>Memo (optional)</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Enter memo"
          />
        </div>

        <button className="send-btn mt-2" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
};
