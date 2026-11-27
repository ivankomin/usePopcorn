/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogFilters from "@/components/CatalogFilters";
import { I18nProvider } from "@/components/I18nProvider";

const mockPush = jest.fn();
let mockPathname = "/catalog";
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

function renderFilters(props: React.ComponentProps<typeof CatalogFilters> = {}) {
  return render(
    <I18nProvider>
      <CatalogFilters {...props} />
    </I18nProvider>,
  );
}

describe("CatalogFilters", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPathname = "/catalog";
    mockSearchParams = new URLSearchParams();
    sessionStorage.clear();
  });

  it("renders movie-specific filters (Runtime & Budget) and hides Seasons", () => {
    renderFilters({ mediaType: "movie", genres: ["Action", "Drama"] });

    expect(screen.getByRole("button", { name: /runtime/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /budget/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /seasons/i }),
    ).not.toBeInTheDocument();
  });

  it("renders TV-specific filters (Seasons) and hides Runtime & Budget", () => {
    mockSearchParams = new URLSearchParams("mediaType=tv");
    renderFilters({ mediaType: "tv", genres: ["Action", "Drama"] });

    expect(screen.getByRole("button", { name: /seasons/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /runtime/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /budget/i }),
    ).not.toBeInTheDocument();
  });

  it("opens Genre multi-select dropdown and pushes selected genres to router", async () => {
    const user = userEvent.setup();
    renderFilters({ mediaType: "movie", genres: ["Action", "Drama", "Sci-Fi"] });

    await user.click(screen.getByRole("button", { name: /genre/i }));
    await user.click(screen.getByRole("button", { name: "Action" }));

    expect(mockPush).toHaveBeenCalledWith("/catalog?genres=Action");
  });

  it("renders media type switcher when showMediaTypeFilter is true and switches to TV", async () => {
    const user = userEvent.setup();
    renderFilters({ mediaType: "movie", showMediaTypeFilter: true });

    await user.click(screen.getByRole("button", { name: /series/i }));
    expect(mockPush).toHaveBeenCalledWith("/catalog?mediaType=tv");
  });

  it("clamps manual year input and handles year steppers", async () => {
    const user = userEvent.setup();
    renderFilters({ mediaType: "movie" });

    // Increment min year from 1900 -> 1901
    await user.click(screen.getByLabelText("Increase Min Year"));
    expect(mockPush).toHaveBeenCalledWith("/catalog?minYear=1901");

    // Type a valid max year and blur
    mockPush.mockClear();
    const maxYearInput = screen.getByLabelText(/^max year$/i);
    fireEvent.change(maxYearInput, { target: { value: "2020" } });
    fireEvent.blur(maxYearInput);
    expect(mockPush).toHaveBeenCalledWith("/catalog?maxYear=2020");
  });
});
