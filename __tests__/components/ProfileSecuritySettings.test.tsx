/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileSecuritySettings } from "@/components/profile/settings/ProfileSecuritySettings";
import { useProfile } from "@/hooks/useProfile";

jest.mock("@/hooks/useProfile", () => ({
  useProfile: jest.fn(),
}));

const mockedUseProfile = useProfile as jest.Mock;

describe("ProfileSecuritySettings", () => {
  const updatePassword = jest.fn();

  beforeEach(() => {
    updatePassword.mockReset();
    mockedUseProfile.mockReturnValue({
      user: { id: "u1", email: "user@example.com" },
      email: "user@example.com",
      updatePassword,
    });
  });

  it("blocks submission with weak new password or mismatched confirmation", async () => {
    const user = userEvent.setup();
    render(<ProfileSecuritySettings userEmail="user@example.com" />);

    await user.type(screen.getByLabelText(/^current password$/i), "OldPass1!");
    await user.type(screen.getByLabelText(/^new password$/i), "weakpass");
    await user.type(
      screen.getByLabelText(/^confirm new password$/i),
      "weakpass",
    );

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(updatePassword).not.toHaveBeenCalled();
    expect(screen.getByText(/Password must include:/i)).toBeInTheDocument();

    // Strong password but mismatching confirmation
    await user.clear(screen.getByLabelText(/^new password$/i));
    await user.clear(screen.getByLabelText(/^confirm new password$/i));
    await user.type(screen.getByLabelText(/^new password$/i), "StrongPass1!");
    await user.type(
      screen.getByLabelText(/^confirm new password$/i),
      "DifferentPass1!",
    );

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(updatePassword).not.toHaveBeenCalled();
    expect(
      screen.getByText(/new passwords do not match/i),
    ).toBeInTheDocument();
  });

  it("updates password, clears fields, and renders success message", async () => {
    const user = userEvent.setup();
    updatePassword.mockResolvedValue(undefined);

    render(<ProfileSecuritySettings userEmail="user@example.com" />);

    const currentInput = screen.getByLabelText(/^current password$/i);
    const newInput = screen.getByLabelText(/^new password$/i);
    const confirmInput = screen.getByLabelText(/^confirm new password$/i);

    await user.type(currentInput, "OldPass1!");
    await user.type(newInput, "StrongPass1!");
    await user.type(confirmInput, "StrongPass1!");

    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalledWith({
        currentPassword: "OldPass1!",
        newPassword: "StrongPass1!",
      });
    });

    expect(
      await screen.findByText(/security credentials have been updated/i),
    ).toBeInTheDocument();
    expect(currentInput).toHaveValue("");
    expect(newInput).toHaveValue("");
    expect(confirmInput).toHaveValue("");
  });

  it("renders error banner when updatePassword rejects", async () => {
    const user = userEvent.setup();
    updatePassword.mockRejectedValue(new Error("Current password is invalid."));

    render(<ProfileSecuritySettings userEmail="user@example.com" />);

    await user.type(screen.getByLabelText(/^current password$/i), "Wrong1!");
    await user.type(screen.getByLabelText(/^new password$/i), "StrongPass1!");
    await user.type(
      screen.getByLabelText(/^confirm new password$/i),
      "StrongPass1!",
    );

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText("Current password is invalid."),
    ).toBeInTheDocument();
  });
});
