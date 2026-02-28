/**
 * Tests for the Modal component.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "../../components/Modal";

describe("Modal", () => {
  it("renders children when open", () => {
    render(
      <Modal open onClose={vi.fn()} title="Test Modal">
        <div data-testid="modal-content">Content</div>
      </Modal>
    );

    expect(screen.getByTestId("modal-content")).toBeInTheDocument();
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("does not render children when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Test Modal">
        <div data-testid="modal-content">Content</div>
      </Modal>
    );

    expect(screen.queryByTestId("modal-content")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test Modal">
        Content
      </Modal>
    );

    // Find the close button (typically has an X icon or aria label)
    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
