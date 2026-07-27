export const SYNTHETIC_PAIRED_GUIDE = Object.freeze([
  "I’ve had a long day. Help me reset in one minute.",
  "Help me choose between a quiet evening and seeing friends. Ask me one question before advising.",
  "Actually, make that practical: give me one next step.",
]);

export const SYNTHETIC_PAIRED_SPEECH = Object.freeze(
  SYNTHETIC_PAIRED_GUIDE.map((prompt) =>
    prompt.replace(/[.,:;!?]/gu, "").trim(),
  ),
);
