/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddMediaForm } from "@/components/admin/AddMediaForm";
import {
  createMediaItemAction,
  checkDuplicateMediaAction,
  uploadMediaPosterAction,
} from "@/app/actions/admin";
import type { GenreRow } from "@/types/media";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (
    rawProps: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      unoptimized?: boolean;
    },
  ) => {
    const props = { ...rawProps };
    delete props.fill;
    delete props.unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ""} />;
  },
}));

jest.mock("@/app/actions/admin", () => ({
  createMediaItemAction: jest.fn(),
  checkDuplicateMediaAction: jest.fn(),
  uploadMediaPosterAction: jest.fn(),
}));

const mockedCreateMedia = createMediaItemAction as jest.Mock;
const mockedCheckDuplicate = checkDuplicateMediaAction as jest.Mock;
const mockedUploadPoster = uploadMediaPosterAction as jest.Mock;

const genres: GenreRow[] = [
  { id: 28, name: "Action" },
  { id: 878, name: "Sci-Fi" },
];

describe("AddMediaForm", () => {
  beforeEach(() => {
    mockedCreateMedia.mockReset();
    mockedCheckDuplicate.mockReset().mockResolvedValue({ exists: false });
    mockedUploadPoster.mockReset();

    URL.createObjectURL = jest.fn(() => "blob:mock-preview");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("locks inputs and shows sync alert when systemStatus is Updating", () => {
    render(<AddMediaForm genres={genres} systemStatus="Updating" />);

    expect(
      screen.getByText(/System Synchronization Active \(Updating\)/i),
    ).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("e.g. Inception")[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: /locked/i })).toBeDisabled();
  });

  it("switches between Movie and TV Series fields", async () => {
    const user = userEvent.setup();
    render(<AddMediaForm genres={genres} systemStatus="Free" />);

    expect(screen.getByPlaceholderText("148")).toBeInTheDocument();
    expect(screen.queryByText("Seasons")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /TV Series/i }));

    expect(screen.queryByPlaceholderText("148")).not.toBeInTheDocument();
    expect(screen.getByText("Seasons")).toBeInTheDocument();
    expect(screen.getByText("Episodes")).toBeInTheDocument();
  });

  it("validates poster file MIME type and 5 MB limit client-side", () => {
    render(<AddMediaForm genres={genres} systemStatus="Free" />);

    const fileInput = document.getElementById(
      "admin-poster-upload",
    ) as HTMLInputElement;

    // Invalid MIME type
    const badFile = new File(["gif"], "poster.gif", { type: "image/gif" });
    fireEvent.change(fileInput, { target: { files: [badFile] } });
    expect(
      screen.getByText(/Invalid image format\. Please select a JPG, PNG, or WebP image\./i),
    ).toBeInTheDocument();

    // Oversized file (> 5 MB)
    const bigFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });
    expect(
      screen.getByText(/Image size must be under 5 MB\./i),
    ).toBeInTheDocument();

    // Valid file sets preview
    const validFile = new File(["ok"], "poster.webp", { type: "image/webp" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    expect(screen.getByText(/poster\.webp/i)).toBeInTheDocument();
    expect(screen.getByAltText("Poster preview")).toHaveAttribute(
      "src",
      "blob:mock-preview",
    );
  });

  it("validates poster Image URL mode and YouTube trailer URL", async () => {
    const user = userEvent.setup();
    render(<AddMediaForm genres={genres} systemStatus="Free" />);

    await user.click(screen.getByRole("button", { name: /Image URL/i }));
    const urlInput = screen.getByPlaceholderText(
      /https:\/\/image\.tmdb\.org/i,
    );

    await user.type(urlInput, "ftp://bad.example.com/poster.jpg");
    expect(
      screen.getByText(/Poster URL must start with http:\/\/ or https:\/\//i),
    ).toBeInTheDocument();

    await user.clear(urlInput);
    await user.type(urlInput, "https://image.tmdb.org/t/p/w500/poster.jpg");
    expect(screen.getByAltText("Poster preview")).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w500/poster.jpg",
    );

    // Trailer URL validation feedback
    const trailerInput = screen.getByPlaceholderText(
      /https:\/\/www\.youtube\.com\/watch/i,
    );
    await user.type(trailerInput, "not-a-valid-youtube-link");
    expect(screen.getByText(/Invalid YouTube URL/i)).toBeInTheDocument();

    await user.clear(trailerInput);
    await user.type(
      trailerInput,
      "https://www.youtube.com/watch?v=YoHD9XEInc0",
    );
    expect(
      screen.getByText(/Valid YouTube ID: YoHD9XEInc0/i),
    ).toBeInTheDocument();
  });

  it("shows duplicate warning after debounce and blocks submission", async () => {
    jest.useFakeTimers();
    mockedCheckDuplicate.mockResolvedValue({
      exists: true,
      existingItem: { id: "dup-1", title: "Inception", release_year: 2026 },
    });

    render(<AddMediaForm genres={genres} systemStatus="Free" />);

    fireEvent.change(screen.getAllByPlaceholderText("e.g. Inception")[0], {
      target: { value: "Inception" },
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(
      await screen.findByText(/Duplicate Entry Detected/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Media/i }),
    ).toBeDisabled();
  });

  it("uploads poster, submits parsed media payload, and resets form on success", async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();

    mockedUploadPoster.mockResolvedValue({
      success: true,
      data: { url: "https://storage.example.com/posters/interstellar.jpg" },
    });
    mockedCreateMedia.mockResolvedValue({
      success: true,
      data: { mediaId: "new-media-1" },
    });

    render(
      <AddMediaForm
        genres={genres}
        systemStatus="Free"
        onSuccess={onSuccess}
      />,
    );

    await user.type(
      screen.getAllByPlaceholderText("e.g. Inception")[0],
      "Interstellar",
    );
    await user.type(
      screen.getByPlaceholderText("e.g. Christopher Nolan"),
      "Christopher Nolan",
    );
    await user.type(
      screen.getByPlaceholderText(
        "e.g. Leonardo DiCaprio, Joseph Gordon-Levitt",
      ),
      "Matthew McConaughey, Anne Hathaway",
    );
    await user.click(screen.getByRole("button", { name: "Sci-Fi" }));

    const fileInput = document.getElementById(
      "admin-poster-upload",
    ) as HTMLInputElement;
    const validFile = new File(["img"], "interstellar.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await user.click(screen.getByRole("button", { name: /Add Media/i }));

    await waitFor(() => {
      expect(mockedUploadPoster).toHaveBeenCalledTimes(1);
      expect(mockedCreateMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Interstellar",
          media_type: "movie",
          poster_path: "https://storage.example.com/posters/interstellar.jpg",
          genre_ids: [878],
          directors: ["Christopher Nolan"],
          cast: ["Matthew McConaughey", "Anne Hathaway"],
        }),
      );
    });

    expect(onSuccess).toHaveBeenCalledWith("new-media-1");
    expect(
      await screen.findByText(/Media successfully ingested into catalog!/i),
    ).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("e.g. Inception")[0]).toHaveValue("");
  });
});
