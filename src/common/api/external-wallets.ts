import axios from "axios";

const API = axios.create({
  // baseURL: "http://localhost:2000/api",
  baseURL: "https://web3api.breakaway.community/api"
});

// 1️⃣ Generate Mnemonic
export const generateMnemonic = async () => {
  const res = await API.get("/wallet/mnemonic");
  console.log(res);
  return res;
};

// 2️⃣ Derive Addresses from Mnemonic
export const deriveAddresses = async (mnemonic: any) => {
  const res = await API.post("/wallet/address", { mnemonic });
  return res.data;
};

// export const getWalletInfo = async (wallets: any) => {
//   console.log("object...wallets", wallets)
//   const res = await API.post("/wallet/info", { wallets });
//   return res.data;
// };

const EXCLUDED_SYMBOLS = ["HIVE", "HBD", "HP", "POINTS"];

export const getWalletInfo = async (wallets: any[] = []) => {
  const filteredWallets = wallets.filter(
    (w) => !EXCLUDED_SYMBOLS.includes(w.symbol) && w.type === "CHAIN"
  );

  // 🔥 Transform array → object
  const payload: Record<string, any> = {};

  for (const wallet of filteredWallets) {
    payload[wallet.symbol] = {
      address: wallet.meta.address,
      publicKey: wallet.meta.publicKey,
      imageUrl: wallet.meta.imageUrl
    };
  }

  console.log("Sending wallets to backend:", payload);

  const res = await API.post("/wallet/info", {
    wallets: payload
  });

  return res.data;
};
