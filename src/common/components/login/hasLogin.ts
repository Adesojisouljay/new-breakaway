import { error } from "../feedback";

export const loginHAS = async (username: string, setQUri: any, setSign: any, login: any) => {
  if (typeof window === "undefined") return null;

  try {
    const HASModule = await import("hive-auth-wrapper");
    const HAS = HASModule.default || HASModule;

    const APP_META = {
      name: "BAC",
      description: "BAC",
      icon: "keyChainLogo",
    };

    const auth = {
      username,
      token: undefined,
      expire: undefined,
      key: "11edc52b-2918-4d71-9058-f7285e29d894",
    };

     // 👇 the message you want to sign
     const messageObj: any = {
      "signed_message": {
          "type": "code",
          "app": "ecency.app"
      },
      "authors": [
          username
      ],
      "timestamp": Date.now()
  }

    const challenge = JSON.stringify(messageObj);

    const evt: any = await new Promise((resolve, reject) => {
      HAS.authenticate(
        auth,
        APP_META,
        { challenge, key_type: "active" },
        (evt: any) => {
          delete evt.cmd;
          delete evt.expire;
          evt.host = "wss://hive-auth.arcange.eu/";
          const json = JSON.stringify(evt);
          const uri = `has://auth_req/${btoa(json)}`;
          setQUri(uri)
      
        }
      ).then((res: any) => {
        console.log('Res', res.data.challenge.challenge)
        messageObj.signatures = [res.data.challenge.challenge]
        setSign(messageObj)
        login()
      }).catch((err: any) => {
        console.log('Rejected', error)
        reject
      });
    });

return evt
  } catch (err) {
    console.error("HAS login error:", err);
    return null;
  }
};
