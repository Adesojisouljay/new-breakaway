import {b64uEnc} from "../util/b64";

export const getAuthUrl = (redir: string = `${window.location.origin}/auth`) => {
    const app = "ecency.app";
    const scope = "vote,comment,delete_comment,comment_options,custom_json,claim_reward_balance,offline";

    return `https://hivesigner.com/oauth2/authorize?client_id=${app}&redirect_uri=${encodeURIComponent(
        redir
    )}&response_type=code&scope=${encodeURIComponent(scope)}`;
};

export const getTokenUrl = (code: string, secret: string) => {
    return `https://hivesigner.com/api/oauth2/token?code=${code}&client_secret=${secret}`;
};

export interface HiveSignerMessage {
    signed_message: {
        type: string;
        app: string;
    },
    authors: string[];
    timestamp: number;
    signatures?: string[];
}

export const makeHsCode = async (account: string, signer: (message: string) => Promise<string>): Promise<string> => {
    const timestamp = new Date().getTime() / 1000;

    const messageObj: HiveSignerMessage = {signed_message: {type: 'code', app: "ecency.app"}, authors: [account], timestamp};

    const message = JSON.stringify(messageObj);

    const signature = await signer(message);

    messageObj.signatures = [signature];

    return b64uEnc(JSON.stringify(messageObj));
}
