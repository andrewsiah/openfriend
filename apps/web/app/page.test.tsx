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

  it("puts profile comparison before the Watch field test", () => {
    render(<HomePage />);

    const deliverySequence = screen.getByLabelText("Delivery sequence");

    expect(deliverySequence).toHaveTextContent(
      /Compare Economy and Quality[\s\S]*Watch Field Test/,
    );
  });

  it("renders the idle browser voice lab instead of a disabled Phase 0 control", () => {
    render(<HomePage />);

    expect(screen.getByRole("status")).toHaveTextContent(/idle/i);
    expect(
      screen.getByRole("button", { name: /start live conversation/i }),
    ).toBeEnabled();
    expect(screen.queryByText(/arrives in phase 1/i)).not.toBeInTheDocument();
  });
});
