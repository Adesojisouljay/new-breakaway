import axios, { AxiosResponse } from "axios";
import * as ls from "../util/local-storage";

// const baUrl = "http://localhost:4000"
const baUrl = "https://api.breakaway.community";
const accessToken = ls.get("ba_access_token");

export const createBreakawayUser = async (
  username: string,
  community: string,
  referral: string,
  email: string
) => {
  try {
    const data = {
      username,
      community,
      referral,
      email
    };
    const resp = await axios.post(`${baUrl}/signup-keychain`, data);
    return resp;
  } catch (err) {
    console.log(err);
    return err;
  }
};

export const createSolanaUser = async (
  email: string,
  password: string,
  solanaWalletAddress: string
) => {
  try {
    const data = {
      email,
      password,
      solanaWalletAddress
    };

    const resp = await axios.post(`${baUrl}/offchain-users/register`, data);

    return resp.data;
  } catch (err) {
    console.log(err);

    return { err };
  }
};

export const processLogin = async (
  username: string,
  ts: string,
  sig: string,
  community: string
) => {
  try {
    const response: any = await axios.get(`${baUrl}/auth/login`, {
      params: { username, ts, sig, community }
    });

    const { token, ...user } = response.data.response;

    return response;
  } catch (error) {
    console.error("Login Failed: ", error);
  }
};

export const claimBaPoints = async (username: string, community: string) => {
  try {
    const response = await axios.post(
      `${baUrl}/points/claim`,
      {
        username: username,
        community: community
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    return response;
  } catch (error) {
    console.error("Error claiming points:", error);
    throw error;
  }
};

export const getBaUserPoints = async (
  username: string,
  community: string
): Promise<any[] | undefined> => {
  try {
    const response: AxiosResponse | any = await axios.get(
      `${baUrl}/points?username=${username}&community=${community}`
    );

    return response;
  } catch (error) {
    console.error("Error fetching user points:", error);
    throw error;
  }
};

export const updateUserPoints = async (username: string, community: string, pointType: string) => {
  try {
    const requestData = {
      username,
      community,
      pointType
    };

    const response = await axios.post(`${baUrl}/points`, requestData, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response;
  } catch (error) {
    console.log("Error updating user points:", error);
    throw error;
  }
};

export const getBtcWalletBalance = async (address: string) => {
  try {
    const response = await axios.get(`${baUrl}/btc-balance/${address}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching Bitcoin balance:", error);
    throw error;
  }
};

export const getBtcTransactions = async (address: string) => {
  try {
    const response = await axios.get(`${baUrl}/address-trx/${address}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching Bitcoin transactions:", error);
    throw error;
  }
};

// export const getUserByUsername = async (username: string) => {
//   try {
//     const response = await axios.get(`${baUrl}/user/${username}`);
//     console.log("...resp....",response)
//     if(!response) {
//       console.log("no user found here....")

//       return
//     } else {
//       return response.data;
//     }

//   } catch (error) {
//     console.error('Error fetching user by username:', error);
//     throw error;
//   }
// };

export const getUserByUsername = async (username: string) => {
  try {
    const response = await axios.get(`${baUrl}/user/${username}`);

    if (response?.status === 200 && response?.data) {
      return response.data;
    } else {
      return null;
    }
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }

    console.error("Error fetching user by username:", error);
    throw error;
  }
};

export const fetchBtcUsers = async () => {
  try {
    const response = await axios.get(`${baUrl}/btc-users`);
    return response.data;
  } catch (error) {
    console.error("Error fetching BTC users:", error);
  }
};

export const createFreeAccount = async (username: string, keys: any) => {
  try {
    const response = await axios.post(`${baUrl}/create-free-account`, {
      username,
      accountKeys: keys
    });

    return response.data;
  } catch (error) {
    console.error("Something went wrong:", error);
    throw error;
  }
};

export const getAccountKeys = async (username: string) => {
  try {
    const response = await axios.post(`${baUrl}/get-account-keys`, { username });

    return response.data;
  } catch (error) {
    console.error("Something went wrong:", error);
    throw error;
  }
};

export const checkBtcMachine = async (address: string) => {
  try {
    const response = await axios.get(`${baUrl}/get-account-keys/${address}`);

    return response.data;
  } catch (error) {
    console.error("Something went wrong:", error);
    throw error;
  }
};

///////Btc ordinals
export const fetchOrdinals = async (address: any) => {
  const API_URL = `https://api.hiro.so/ordinals/v1/inscriptions?address=${address}`;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results;
  } catch (error: any) {
    console.error("Failed to fetch ordinals:", error.message);
    return [];
  }
};

export const getInvoice = async (setInvoiceData: any, username: string) => {
  try {
    const satsToPay = await getHiveToSats(3);
    const response = await axios.get("https://api.v4v.app/v1/new_invoice_hive", {
      params: {
        hive_accname: "lightningin",   // Hive account to receive funds
        amount: 250,                    // Amount requested
        currency: "SATS",                // Unit of requested amount
        receive_currency: "sats",        // How the receiver gets it
        usd_hbd: false,                  // Whether to use USD conversion for HBD
        app_name: "BAC",                // Your app name
        expiry: 300,                     // Expiry in seconds
        message: username,
        qr_code: "none"                  // "png" if you want image from API
      },
      headers: {
        accept: "application/json",
      },
    });

    // console.log("Invoice Data:", `lightning:${response?.data.payment_request}`);
    // console.log("Api Data:", response?.data);
    setInvoiceData(response?.data)
    return response.data
  } catch (error: any) {
    console.error("Error fetching invoice:", error.response?.data || error.message);
  }
};

export const getLightning = async (data: any) => {
  // console.log("object data", data)
  try {
    const response = await axios.post(
      `${baUrl}/lightning-account`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // console.log("✅ Lightning account response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ getLightning error:", error.response?.data || error.message);
    throw error;
  }
};

export const getHiveToSats = async (hiveAmount: number): Promise<number> => {
  const res = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=hive&vs_currencies=btc"
  );

  // console.log("object...", res)

  const hivePriceBTC = res.data?.hive?.btc || 0;
  const sats = Math.round(hiveAmount * hivePriceBTC * 100_000_000);

  // console.log("sats.....", sats)
  return sats;
}

export const getAccountStatus = async (username: string) => {
  try {
    const response = await axios.get(`${baUrl}/account-status/${username}`);
    // console.log("status....",response)
    return response.data; // { created: boolean, status?: string, account?: object }
  } catch (error: any) {
    console.error("❌ Error fetching account status:", error.response?.data || error.message);
    throw error;
  }
};