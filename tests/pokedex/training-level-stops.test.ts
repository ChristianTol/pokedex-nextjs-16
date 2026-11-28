import {
  createElement,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TrainingLevelStops } from "@/components/pokedex/TrainingGuide";
import {
  TrainingRangeInput,
  trainingRangeValueAtPointer,
} from "@/components/pokedex/TrainingStatEditor";

describe("TrainingLevelStops", () => {
  it("renders accessible, selectable stops and marks the active level", () => {
    const markup = renderToStaticMarkup(
      createElement(TrainingLevelStops, {
        level: 40,
        onSelectLevel: () => {},
        levelLabel: "Level",
      }),
    );

    expect(markup.match(/aria-label="Level (?:20|40|60|80)"/g)).toHaveLength(4);
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Level 40" aria-pressed="true"');
    expect(markup.match(/style="left:calc\(/g)).toHaveLength(4);
    expect(markup.match(/aria-hidden="true" class="rounded-full/g)).toHaveLength(4);
    expect(markup).not.toContain(">20</button>");
    expect(markup).not.toContain(">40</button>");
    expect(markup).not.toContain(">60</button>");
    expect(markup).not.toContain(">80</button>");
    expect(markup).toContain("size-3 border-2 border-[#047857]");
    expect(markup).toContain("size-2 bg-border");
  });

  it("selects each stop and updates the level while dragging from a stop", () => {
    const onSelectLevel = vi.fn();
    const element = TrainingLevelStops({
      level: 100,
      onSelectLevel,
      levelLabel: "Level",
    });
    type StopButtonProps = {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
      onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    };
    const buttons = element.props.children as ReactElement<StopButtonProps>[];

    const bounds = { left: 0, width: 116 } as DOMRect;
    const currentTarget = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      parentElement: { getBoundingClientRect: () => bounds },
    } as unknown as HTMLButtonElement;

    buttons.forEach((button, index) => {
      button.props.onPointerDown({
        button: 0,
        pointerId: index,
        currentTarget,
      } as unknown as PointerEvent<HTMLButtonElement>);
    });
    buttons[0]?.props.onPointerMove({
      pointerId: 0,
      clientX: 58,
      currentTarget,
    } as unknown as PointerEvent<HTMLButtonElement>);
    buttons[0]?.props.onClick({ detail: 1 } as MouseEvent<HTMLButtonElement>);
    buttons[0]?.props.onClick({ detail: 0 } as MouseEvent<HTMLButtonElement>);

    expect(onSelectLevel.mock.calls).toEqual([
      [20],
      [40],
      [60],
      [80],
      [51],
      [20],
    ]);
    expect(currentTarget.setPointerCapture).toHaveBeenCalledTimes(4);
  });

  it("maps the full slider track to bounded values, including dynamic limits", () => {
    const bounds = { left: 100, width: 200 } as DOMRect;

    expect(trainingRangeValueAtPointer(100, bounds, 0, 252)).toBe(0);
    expect(trainingRangeValueAtPointer(200, bounds, 0, 252)).toBe(126);
    expect(trainingRangeValueAtPointer(292, bounds, 0, 252)).toBe(252);
    expect(trainingRangeValueAtPointer(400, bounds, 0, 47)).toBe(47);
  });

  it("jumps to the touched track position and keeps following the captured pointer", () => {
    const onChange = vi.fn();
    const element = TrainingRangeInput({
      min: 0,
      max: 252,
      value: 252,
      ariaLabel: "EV",
      onChange,
    });
    type RangeInputProps = {
      onPointerDown: (event: PointerEvent<HTMLInputElement>) => void;
      onPointerMove: (event: PointerEvent<HTMLInputElement>) => void;
    };
    const input = element.props as RangeInputProps;
    const bounds = { left: 100, width: 200 } as DOMRect;
    const currentTarget = {
      getBoundingClientRect: () => bounds,
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
    } as unknown as HTMLInputElement;

    input.onPointerDown({
      isPrimary: true,
      pointerType: "touch",
      button: 0,
      pointerId: 7,
      clientX: 200,
      currentTarget,
    } as unknown as PointerEvent<HTMLInputElement>);
    input.onPointerMove({
      pointerId: 7,
      clientX: 100,
      currentTarget,
    } as unknown as PointerEvent<HTMLInputElement>);
    input.onPointerMove({
      pointerId: 7,
      clientX: 292,
      currentTarget,
    } as unknown as PointerEvent<HTMLInputElement>);

    expect(onChange.mock.calls).toEqual([[126], [0], [252]]);
    expect(currentTarget.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it("keeps native range accessibility while disabling touch scrolling during a drag", () => {
    const markup = renderToStaticMarkup(
      createElement(TrainingRangeInput, {
        min: 1,
        max: 100,
        value: 50,
        ariaLabel: "Level",
        onChange: () => {},
      }),
    );

    expect(markup).toContain('type="range"');
    expect(markup).toContain('aria-label="Level"');
    expect(markup).toContain("touch-none");
  });
});