import { describe, expect, it } from "vitest";

import {
  SYNTHETIC_PAIRED_GUIDE,
  SYNTHETIC_PAIRED_SPEECH,
} from "./spoken-guide.mjs";

describe("synthetic paired speech fixtures", () => {
  it("keeps the accepted guide words without punctuation-induced turn boundaries", () => {
    expect(SYNTHETIC_PAIRED_GUIDE).toEqual([
      "I’ve had a long day. Help me reset in one minute.",
      "Help me choose between a quiet evening and seeing friends. Ask me one question before advising.",
      "Actually, make that practical: give me one next step.",
    ]);
    expect(SYNTHETIC_PAIRED_SPEECH).toEqual([
      "I’ve had a long day Help me reset in one minute",
      "Help me choose between a quiet evening and seeing friends Ask me one question before advising",
      "Actually make that practical give me one next step",
    ]);
    expect(
      SYNTHETIC_PAIRED_SPEECH.every((phrase) => !/[.,:;!?]/u.test(phrase)),
    ).toBe(true);
  });
});
