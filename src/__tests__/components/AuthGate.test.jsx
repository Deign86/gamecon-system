/**
 * Tests for AuthGate component.
 *
 * Verifies login form rendering, validation, and interaction.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Must mock useAuth before importing AuthGate
vi.mock("../../hooks/useAuth", () => ({
  signIn: vi.fn(),
  useAuth: () => ({ user: null, profile: null, loading: false }),
  AuthProvider: ({ children }) => children,
}));

import AuthGate from "../../components/AuthGate";
import { signIn } from "../../hooks/useAuth";

describe("AuthGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Helper to get form inputs by their stable IDs */
  const getEmailInput = () => document.getElementById("login-email");
  const getPasswordInput = () => document.getElementById("login-password");
  const getSubmitBtn = () => screen.getByRole("button", { name: /access system/i });

  it("renders login form with email and password fields", () => {
    render(<AuthGate />);

    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
  });

  it("renders access system button", () => {
    render(<AuthGate />);
    expect(getSubmitBtn()).toBeInTheDocument();
  });

  it("calls signIn with email and password on submit", async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValueOnce({});

    render(<AuthGate />);

    await user.type(getEmailInput(), "admin@gamecon2026.com");
    await user.type(getPasswordInput(), "password123");
    await user.click(getSubmitBtn());

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("admin@gamecon2026.com", "password123");
    });
  });

  it("displays error message on failed login", async () => {
    const user = userEvent.setup();
    signIn.mockRejectedValueOnce({ code: "auth/invalid-credential" });

    render(<AuthGate />);

    await user.type(getEmailInput(), "test@test.com");
    await user.type(getPasswordInput(), "wrongpass");
    await user.click(getSubmitBtn());

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
    });
  });

  it("disables button while signing in", async () => {
    // signIn never resolves — simulates loading state
    signIn.mockImplementationOnce(() => new Promise(() => {}));

    render(<AuthGate />);

    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "passss" } });
    fireEvent.submit(getSubmitBtn());

    await waitFor(() => {
      // During loading, the button text is replaced by a spinner so
      // getByRole with a name won't match. Find the submit button directly.
      const btn = document.querySelector('button[type="submit"]');
      expect(btn).toBeDisabled();
    });
  });
});
