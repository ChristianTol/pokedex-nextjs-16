import {
  createElement,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TrainingLevelStops } from "@/components/pokedex/TrainingGuide";

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
});