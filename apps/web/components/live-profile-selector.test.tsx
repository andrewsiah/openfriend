import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { listLiveModelProfiles } from "@openfriend/contracts";

import { LiveProfileSelector } from "./live-profile-selector";

describe("LiveProfileSelector", () => {
  it("offers Economy and Quality with Economy selected initially", () => {
    render(<LiveProfileSelector profiles={listLiveModelProfiles()} />);

    expect(screen.getByRole("radio", { name: /Economy/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Quality/i })).not.toBeChecked();
    expect(screen.getByText("gpt-realtime-2.1-mini")).toBeInTheDocument();
  });

  it("shows the Quality model after it is selected", async () => {
    const user = userEvent.setup();
    render(<LiveProfileSelector profiles={listLiveModelProfiles()} />);

    await user.click(screen.getByRole("radio", { name: /Quality/i }));

    expect(screen.getByRole("radio", { name: /Quality/i })).toBeChecked();
    expect(screen.getByText("gpt-realtime-2.1")).toBeInTheDocument();
  });
});
