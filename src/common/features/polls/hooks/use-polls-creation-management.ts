import useLocalStorage from "react-use/lib/useLocalStorage";
import { PREFIX } from "../../../util/local-storage";
import { useEffect, useMemo, useState } from "react";
import { addDays, isBefore } from "date-fns";
import { PollSnapshot } from "../components";

export function usePollsCreationManagement(poll?: PollSnapshot) {
  const [title, setTitle, clearTitle] = useLocalStorage(PREFIX + "_plls_t", "");
  const [endDate, setEndDate, clearEndDate] = useLocalStorage(
    PREFIX + "_plls_ed",
    addDays(new Date(), 7),
    {
      raw: false,
      deserializer: (v: string) => new Date(v),
      serializer: (v: Date) => v.toISOString()
    }
  );
  const [accountAge, setAccountAge, clearAccountAge] = useLocalStorage(PREFIX + "_plls_ag", 100);
  const [choices, setChoices, clearChoices] = useLocalStorage<string[]>(PREFIX + "_plls_ch", []);
  const [interpretation, setInterpretation] =
    useState<PollSnapshot["interpretation"]>("number_of_votes");
  const [voteChange, setVoteChange] = useLocalStorage(PREFIX + "_plls_vc", true);
  const [hideVotes, setHideVotes] = useLocalStorage(PREFIX + "_plls_cs", false);

  const hasEmptyOrDuplicatedChoices = useMemo(() => {
    if (!choices || choices.length <= 1) {
      return true;
    }

    const hasDuplicates = new Set(choices).size !== choices.length;
    return choices.some((c) => !c) || hasDuplicates;
  }, [choices]);
  const isExpiredEndDate = useMemo(
    () => (endDate ? isBefore(endDate, new Date()) : false),
    [endDate]
  );

  useEffect(() => {
    if (poll) {
      setTitle(poll.title);
      setChoices(poll.choices);
      setAccountAge(poll.filters.accountAge);
      setEndDate(poll.endTime);
      setInterpretation(poll.interpretation);
      setVoteChange(poll.voteChange);
      setHideVotes(poll.hideVotes);
    }
  }, [poll]);

  const pushChoice = (choice: string) => setChoices([...(choices ?? []), choice]);

  const deleteChoiceByIndex = (index: number) => {
    const next = [...(choices ?? [])];
    next.splice(index, 1);
    return setChoices(next);
  };

  const updateChoiceByIndex = (choice: string, index: number) => {
    const next = [...(choices ?? [])];
    next.splice(index, 1, choice);
    return setChoices(next);
  };

  return {
    title,
    setTitle,
    choices,
    pushChoice,
    deleteChoiceByIndex,
    updateChoiceByIndex,
    hasEmptyOrDuplicatedChoices,
    accountAge,
    setAccountAge,
    endDate,
    setEndDate,
    interpretation,
    setInterpretation,
    hideVotes,
    setHideVotes,
    voteChange,
    setVoteChange,
    isExpiredEndDate,
    clearAll: () => {
      clearTitle();
      clearEndDate();
      clearAccountAge();
      clearChoices();
    }
  };
}
