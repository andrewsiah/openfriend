import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("OpenFriend foundation page", () => {
  it("describes the product as a full-duplex conversational companion", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /a conversation that can keep up with a life/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/full-duplex conversational companion/i),
    ).toBeInTheDocument();
  });

  it("moves from the web voice lab directly to the Watch field test", () => {
    render(<HomePage />);

    const deliverySequence = screen.getByLabelText("Delivery sequence");

    expect(deliverySequence).toHaveTextContent(
      /Web Voice Lab[\s\S]*Watch Field Test/,
    );
  });

  it("truthfully marks voice as not connected", () => {
    render(<HomePage />);

    expect(screen.getByText(/Foundation ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Voice not connected/i)).toBeInTheDocument();
  });
});
