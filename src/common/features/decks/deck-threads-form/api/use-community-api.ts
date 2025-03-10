import { useMappedStore } from "../../../../store/use-mapped-store";
import { FullAccount } from "../../../../store/accounts/types";
import { createPermlink, makeCommentOptions } from "../../../../helper/posting";
import { comment } from "../../../../api/operations";
import tempEntry from "../../../../helper/temp-entry";
import { Entry } from "../../../../store/entries/types";
import { EntryMetadataManagement } from "../../../entry-management";

export function useCommunityApi() {
  const { activeUser, addEntry } = useMappedStore();

  const request = async (host: string, raw: string, editingEntry?: Entry) => {
    if (!activeUser || !activeUser.data.__loaded) {
      throw new Error("No user");
    }

    let hostTag = "";

    if (host === "dbuzz") {
      hostTag = "hive-193084";
    }

    // clean body
    const cleanedRaw = raw.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, "");
    const author = activeUser.username;
    const authorData = activeUser.data as FullAccount;
    const permlink = editingEntry?.permlink ?? createPermlink("", true);
    const options = makeCommentOptions(author, permlink, "default");

    const jsonMeta = EntryMetadataManagement.EntryMetadataManager.shared
      .builder()
      .default()
      .extractFromBody(raw)
      .withTags([
        hostTag,
        ...(raw.match(/\#[a-zA-Z0-9]+/g)?.map((tag) => tag.replace("#", "")) ?? ["ecency"])
      ])
      .build();

    await comment(author, "", hostTag, permlink, "", cleanedRaw, jsonMeta, options, true);

    const entry = {
      ...tempEntry({
        author: authorData!,
        permlink,
        parentAuthor: "",
        parentPermlink: "",
        title: "",
        body: cleanedRaw,
        tags: [hostTag],
        description: ""
      }),
      max_accepted_payout: options.max_accepted_payout,
      percent_hbd: options.percent_hbd
    };
    addEntry(entry);

    return entry;
  };

  return { request };
}
