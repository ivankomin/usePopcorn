/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { I18nProvider } from "@/components/I18nProvider";
import { useRatings } from "@/hooks/useRatings";

jest.mock("@/hooks/useRatings", () => ({
  useRatings: jest.fn(),
}));

jest.mock("@/components/StarRating", () => ({
  StarRating: ({
    value,
    onChange,
  }: {
    value?: number | null;
    onChange?: (event: unknown, value: number | null) => void;
  }) => (
    <div data-testid="star-rating" data-value={value ?? 0}>
      <button
        type="button"
        onClick={() => onChange?.({}, 4.5)}
        data-testid="rate-9"
      >
        Rate 4.5 stars
      </button>
      <button
        type="button"
        onClick={() => onChange?.({}, null)}
        data-testid="rate-clear"
      >
        Clear stars
      </button>
    </div>
  ),
}));

const mockedUseRatings = useRatings as jest.Mock;

function renderForm(props: React.ComponentProps<typeof ReviewForm>) {
  return render(
    <I18nProvider>
      <ReviewForm {...props} />
    </I18nProvider>,
  );
}

describe("ReviewForm", () => {
  const submitReview = jest.fn();

  beforeEach(() => {
    submitReview.mockReset();
    mockedUseRatings.mockReturnValue({ submitReview });
  });

  it("disables submit when both rating and content are empty and enforces 1000-char maxLength", () => {
    renderForm({ mediaId: "media-1" });

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("maxLength", "1000");

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    expect(submitBtn).toBeDisabled();
  });

  it("submits rating (mapped to 1-10) and trimmed content, invokes onSuccess, and resets content", async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    submitReview.mockResolvedValue({
      id: "r1",
      rating: 9,
      content: "Brilliant sci-fi",
      status: "approved",
    });

    renderForm({ mediaId: "media-1", onSuccess });

    await user.click(screen.getByTestId("rate-9"));
    expect(screen.getByText("9 / 10")).toBeInTheDocument();

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "  Brilliant sci-fi  ");

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(submitReview).toHaveBeenCalledWith("media-1", {
        rating: 9,
        content: "Brilliant sci-fi",
      });
    });

    expect(onSuccess).toHaveBeenCalledWith({
      rating: 9,
      content: "Brilliant sci-fi",
      status: "approved",
    });
    expect(textarea).toHaveValue("");
  });

  it("clears selected rating via the Clear button", async () => {
    const user = userEvent.setup();
    renderForm({ mediaId: "media-1", initialRating: 8 });

    expect(screen.getByText("8 / 10")).toBeInTheDocument();

    const clearBtn = screen.getByTitle(/clear/i);
    await user.click(clearBtn);

    expect(screen.queryByText("8 / 10")).not.toBeInTheDocument();
  });

  it("displays an error message when submitReview returns null or throws", async () => {
    const user = userEvent.setup();
    submitReview.mockResolvedValueOnce(null);

    renderForm({ mediaId: "media-1", initialRating: 7 });

    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(
      await screen.findByText(/failed to save your review/i),
    ).toBeInTheDocument();

    submitReview.mockRejectedValueOnce(new Error("Network error"));
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(
      await screen.findByText(/an unexpected error occurred/i),
    ).toBeInTheDocument();
  });

  it("renders edit mode with Cancel button and calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    renderForm({
      mediaId: "media-1",
      initialRating: 6,
      initialContent: "Solid film",
      isEditing: true,
      onCancel,
    });

    expect(screen.getByRole("textbox")).toHaveValue("Solid film");
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
