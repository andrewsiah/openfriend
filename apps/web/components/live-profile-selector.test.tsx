import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  listLiveModelProfiles,
  type LiveModelProfileId,
} from "@openfriend/contracts";

import { LiveProfileSelector } from "./live-profile-selector";

function ProfileSelectorHarness() {
  const [selectedId, setSelectedId] = useState<LiveModelProfileId>("economy");

  return (
    <LiveProfileSelector
      profiles={listLiveModelProfiles()}
      selectedId={selectedId}
      onSelectedIdChange={setSelectedId}
    />
  );
}

describe("LiveProfileSelector", () => {
  it("offers Economy and Quality with Economy selected initially", () => {
    render(<ProfileSelectorHarness />);

    expect(screen.getByRole("radio", { name: /Economy/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Quality/i })).not.toBeChecked();
    expect(screen.getByText("gpt-realtime-2.1-mini")).toBeInTheDocument();
  });

  it("shows the Quality model after it is selected", async () => {
    const user = userEvent.setup();
    render(<ProfileSelectorHarness />);

    await user.click(screen.getByRole("radio", { name: /Quality/i }));

    expect(screen.getByRole("radio", { name: /Quality/i })).toBeChecked();
    expect(screen.getByText("gpt-realtime-2.1")).toBeInTheDocument();
  });
});
