/**
 * Tests for the Toast system.
 *
 * Verifies ToastProvider + useToast hook behaviour.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ToastProvider, useToast } from "../../components/Toast";

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast("Hello!", "success")}>Show Toast</button>
      <button onClick={() => toast("Error!", "error")}>Show Error</button>
      <button onClick={() => toast("Warning!", "warning")}>Show Warning</button>
    </div>
  );
}

describe("ToastProvider + useToast", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <div data-testid="child">content</div>
      </ToastProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("displays a toast when triggered", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      screen.getByText("Show Toast").click();
    });

    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeInTheDocument();
    });
  });

  it("displays error toasts", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      screen.getByText("Show Error").click();
    });

    await waitFor(() => {
      expect(screen.getByText("Error!")).toBeInTheDocument();
    });
  });
});
