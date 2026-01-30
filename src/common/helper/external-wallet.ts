export interface HiveWalletToken {
  symbol: string;
  type: string;
  meta: {
    show: boolean;
    address?: string;
    publicKey?: string;
    imageUrl?: string;
    [key: string]: any;
  };
}

// export function buildHiveWalletTokens(wallets: any): HiveWalletToken[] {
//   const chains = ["BTC", "ETH", "SOL", "TRON", "BNB", "APTOS"];

//   const tokens: HiveWalletToken[] = [
//     { symbol: "HIVE", type: "HIVE", meta: { show: true } },
//     { symbol: "HBD", type: "HIVE", meta: { show: true } },
//     { symbol: "HP", type: "HIVE", meta: { show: true } },
//     { symbol: "POINTS", type: "HIVE", meta: { show: true } },
//   ];

//   chains.forEach((chain) => {
//     const data = wallets[chain];
//     if (!data) return;

//     tokens.push({
//       symbol: chain,
//       type: "CHAIN",
//       meta: {
//         show: true,
//         address: data.address,
//         publicKey: data.publicKey,
//         imageUrl: data.imageUrl,
//       },
//     });
//   });

//   return tokens;
// }
export function buildHiveWalletTokens(wallets?: any): HiveWalletToken[] {
  if (!wallets) return [];

  const chains = ["BTC", "ETH", "SOL", "TRON", "BNB", "APTOS"];

  const tokens: HiveWalletToken[] = [
    { symbol: "HIVE", type: "HIVE", meta: { show: true } },
    { symbol: "HBD", type: "HIVE", meta: { show: true } },
    { symbol: "HP", type: "HIVE", meta: { show: true } },
    { symbol: "POINTS", type: "HIVE", meta: { show: true } }
  ];

  chains.forEach((chain) => {
    const data = wallets?.[chain];
    if (!data) return;

    tokens.push({
      symbol: chain,
      type: "CHAIN",
      meta: {
        show: true,
        address: data.address,
        publicKey: data.publicKey,
        imageUrl: data.imageUrl
      }
    });
  });

  return tokens;
}
