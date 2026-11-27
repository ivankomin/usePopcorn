/** @jest-environment jsdom */
import { useRef } from "react";
import { render, fireEvent } from "@testing-library/react";
import {
  useOutsideClick,
  type UseOutsideClickOptions,
} from "@/hooks/useOutsideClick";

function TestHarness({
  handler,
  options,
}: {
  handler: () => void;
  options?: boolean | UseOutsideClickOptions;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, handler, options);

  return (
    <div>
      <div ref={ref} data-testid="inside">
        <button type="button" data-testid="inside-child">
          Inside
        </button>
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  );
}

describe("useOutsideClick", () => {
  it("invokes handler on mousedown outside the referenced element", () => {
    const handler = jest.fn();
    const { getByTestId } = render(<TestHarness handler={handler} />);

    fireEvent.mouseDown(getByTestId("outside"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not invoke handler on mousedown inside the referenced element", () => {
    const handler = jest.fn();
    const { getByTestId } = render(<TestHarness handler={handler} />);

    fireEvent.mouseDown(getByTestId("inside"));
    fireEvent.mouseDown(getByTestId("inside-child"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("invokes handler on Escape key by default and ignores other keys", () => {
    const handler = jest.fn();
    render(<TestHarness handler={handler} />);

    fireEvent.keyDown(document, { key: "Enter" });
    expect(handler).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled via boolean or options object", () => {
    const handler = jest.fn();
    const { getByTestId, rerender } = render(
      <TestHarness handler={handler} options={false} />,
    );

    fireEvent.mouseDown(getByTestId("outside"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handler).not.toHaveBeenCalled();

    rerender(<TestHarness handler={handler} options={{ enabled: false }} />);
    fireEvent.mouseDown(getByTestId("outside"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("respects closeOnEscape: false while still handling outside clicks", () => {
    const handler = jest.fn();
    const { getByTestId } = render(
      <TestHarness
        handler={handler}
        options={{ enabled: true, closeOnEscape: false }}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handler).not.toHaveBeenCalled();

    fireEvent.mouseDown(getByTestId("outside"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("removes event listeners on unmount", () => {
    const handler = jest.fn();
    const { unmount } = render(<TestHarness handler={handler} />);
    unmount();

    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handler).not.toHaveBeenCalled();
  });
});
