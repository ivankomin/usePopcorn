/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileDangerZone } from "@/components/profile/settings/ProfileDangerZone";
import { deleteUserAccountAction } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

jest.mock("@/app/actions/profile", () => ({
  deleteUserAccountAction: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

const mockedDeleteAccount = deleteUserAccountAction as jest.Mock;
const mockedCreateClient = createClient as jest.Mock;

describe("ProfileDangerZone", () => {
  const signOutMock = jest.fn();

  beforeEach(() => {
    mockReplace.mockReset();
    mockRefresh.mockReset();
    mockedDeleteAccount.mockReset();
    signOutMock.mockReset().mockResolvedValue({ error: null });
    mockedCreateClient.mockReturnValue({
      auth: { signOut: signOutMock },
    });
  });

  it("opens and cancels the confirmation form while clearing inputs", async () => {
    const user = userEvent.setup();
    render(<ProfileDangerZone />);

    expect(
      screen.queryByLabelText(/current password/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete account/i }));

    const passwordInput = screen.getByLabelText(/current password/i);
    const confirmInput = screen.getByPlaceholderText("DELETE");
    const submitBtn = screen.getByRole("button", {
      name: /permanently delete/i,
    });

    expect(submitBtn).toBeDisabled();

    await user.type(passwordInput, "Secret123!");
    await user.type(confirmInput, "DEL");
    expect(submitBtn).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByLabelText(/current password/i),
    ).not.toBeInTheDocument();
  });

  it("shows error feedback when deleteUserAccountAction fails", async () => {
    const user = userEvent.setup();
    mockedDeleteAccount.mockResolvedValue({
      success: false,
      error: "Incorrect password.",
    });

    render(<ProfileDangerZone />);

    await user.click(screen.getByRole("button", { name: /delete account/i }));
    await user.type(screen.getByLabelText(/current password/i), "WrongPass!");
    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");

    await user.click(
      screen.getByRole("button", { name: /permanently delete/i }),
    );

    expect(await screen.findByText("Incorrect password.")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("deletes account, signs out locally, and redirects home on success", async () => {
    const user = userEvent.setup();
    mockedDeleteAccount.mockResolvedValue({ success: true });

    render(<ProfileDangerZone />);

    await user.click(screen.getByRole("button", { name: /delete account/i }));
    await user.type(
      screen.getByLabelText(/current password/i),
      "ValidPass123!",
    );
    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");

    await user.click(
      screen.getByRole("button", { name: /permanently delete/i }),
    );

    await waitFor(() => {
      expect(mockedDeleteAccount).toHaveBeenCalledWith({
        currentPassword: "ValidPass123!",
        confirmationText: "DELETE",
      });
    });

    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
