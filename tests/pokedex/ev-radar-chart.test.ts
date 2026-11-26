import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EvRadarChart } from "@/components/pokedex/EvRadarChart";

describe("EvRadarChart", () => {
  it("renders all six stats in the expected radar order with exact values", () => {
    const markup = renderToStaticMarkup(
      createElement(EvRadarChart, {
        increasedStat: "special-attack",
        decreasedStat: "special-defense",
        stats: [
          { stat: "hp", label: "HP", value: 4, color: "bg-red-500" },
          { stat: "attack", label: "Attack", value: 252, color: "bg-orange-500" },
          { stat: "defense", label: "Defense", value: 0, color: "bg-yellow-500" },
          { stat: "speed", label: "Speed", value: 252, color: "bg-pink-500" },
          {
            stat: "special-defense",
            label: "Special Defense",
            value: 0,
            color: "bg-green-500",
          },
          {
            stat: "special-attack",
            label: "Special Attack",
            value: 0,
            color: "bg-blue-500",
          },
        ],
      }),
    );

    expect(markup).toContain(
      'points="120,120 120,118.7 189.3,80"',
    );
    expect(markup).toContain(
      '<line x1="120" y1="120" x2="120" y2="118.7" stroke="currentColor"',
    );
    expect(markup).toContain(
      '<line x1="120" y1="120" x2="189.3" y2="80" stroke="currentColor"',
    );
    expect(markup).toContain(
      '<line x1="120" y1="120" x2="120" y2="200" stroke="currentColor"',
    );
    expect(markup).toContain('viewBox="0 0 240 240"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("Special Defense");
    const cornerLabels = [...markup.matchAll(
      /data-stat="([^"]+)"[^>]*style="([^"]+)"><span>([^<]+)<\/span><span class="block font-semibold tabular-nums(?: text-foreground)?">([^<]+)<\/span><\/span>/g,
    )].map(([, stat, style, label, value]) => ({ stat, style, label, value }));
    expect(cornerLabels).toEqual([
      { stat: "hp", style: "left:50%;top:7%;width:30%", label: "HP", value: "4" },
      {
        stat: "attack",
        style: "left:90%;top:28%;width:20%",
        label: "Attack",
        value: "252",
      },
      {
        stat: "defense",
        style: "left:90%;top:72%;width:20%",
        label: "Defense",
        value: "0",
      },
      {
        stat: "speed",
        style: "left:50%;top:93%;width:30%",
        label: "Speed",
        value: "252",
      },
      {
        stat: "special-defense",
        style: "left:10%;top:72%;width:20%",
        label: "Special Defense",
        value: "0",
      },
      {
        stat: "special-attack",
        style: "left:10%;top:28%;width:20%",
        label: "Special Attack",
        value: "0",
      },
    ]);
    expect(markup).toContain(
      'data-stat="special-attack" data-nature-effect="up" class="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight font-semibold text-red-600 dark:text-red-400"',
    );
    expect(markup).toContain(
      'data-stat="special-defense" data-nature-effect="down" class="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight font-semibold text-blue-700 dark:text-blue-400"',
    );
    expect(markup).toContain(
      'data-stat="hp" class="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight"',
    );
    expect(markup.match(/data-ev-stat=/g)).toHaveLength(3);
    expect(markup).toContain(
      '<span class="block font-semibold tabular-nums">4</span>',
    );
    expect(
      markup.match(/<span class="block font-semibold tabular-nums">252<\/span>/g),
    ).toHaveLength(2);
    expect(
      markup.match(/<span class="block font-semibold tabular-nums(?: text-foreground)?">0<\/span>/g),
    ).toHaveLength(3);
    expect(markup).not.toContain("grid w-full grid-cols-2 gap-x-3 gap-y-1.5");
    expect(markup).not.toMatch(/aria-hidden="true" data-stat=/);
  });

  it("shows narrow triangles for isolated stats and points them at the exact EV value", () => {
    const markup = renderToStaticMarkup(
      createElement(EvRadarChart, {
        stats: [
          { stat: "hp", label: "HP", value: 4, color: "bg-red-500" },
          { stat: "attack", label: "Attack", value: 0, color: "bg-orange-500" },
          { stat: "defense", label: "Defense", value: 0, color: "bg-yellow-500" },
          { stat: "speed", label: "Speed", value: 252, color: "bg-pink-500" },
          { stat: "special-defense", label: "Special Defense", value: 0, color: "bg-green-500" },
          { stat: "special-attack", label: "Special Attack", value: 0, color: "bg-blue-500" },
        ],
      }),
    );
    const clipPaths = [...markup.matchAll(/<clipPath id="[^"]+">([\s\S]*?)<\/clipPath>/g)];

    expect(markup).toContain(
      'data-ev-stat="hp" data-ev-value="4" points="120.6,120 119.4,120 120,118.7" fill="currentColor"',
    );
    expect(markup).toContain(
      'data-ev-stat="speed" data-ev-value="252" points="115,120 125,120 120,200" fill="currentColor"',
    );
    expect(clipPaths).toHaveLength(1);
    expect(clipPaths[0]?.[1]).toBe("");
  });

  it("connects adjacent values, including the last-to-first axis pair", () => {
    const renderClipArea = (values: number[]) => {
      const stats = [
        { stat: "hp", label: "HP", color: "bg-red-500" },
        { stat: "attack", label: "Attack", color: "bg-orange-500" },
        { stat: "defense", label: "Defense", color: "bg-yellow-500" },
        { stat: "speed", label: "Speed", color: "bg-pink-500" },
        { stat: "special-defense", label: "Special Defense", color: "bg-green-500" },
        { stat: "special-attack", label: "Special Attack", color: "bg-blue-500" },
      ].map((stat, index) => ({ ...stat, value: values[index] ?? 0 }));
      const markup = renderToStaticMarkup(
        createElement(EvRadarChart, { stats }),
      );
      return [...markup.matchAll(/<clipPath id="[^"]+">([\s\S]*?)<\/clipPath>/g)][0]?.[1] ?? "";
    };

    expect(renderClipArea([4, 252, 0, 0, 0, 0])).toContain(
      'points="120,120 120,118.7 189.3,80"',
    );
    expect(renderClipArea([4, 0, 0, 0, 0, 252])).toContain(
      'points="120,120 50.7,80 120,118.7"',
    );
  });

  it("keeps long localized labels readable beside their matching corners", () => {
    const markup = renderToStaticMarkup(
      createElement(EvRadarChart, {
        stats: [
          { stat: "hp", label: "KP", value: 4, color: "bg-red-500" },
          { stat: "attack", label: "Angriff", value: 252, color: "bg-orange-500" },
          { stat: "defense", label: "Verteidigung", value: 0, color: "bg-yellow-500" },
          { stat: "speed", label: "Initiative", value: 252, color: "bg-pink-500" },
          {
            stat: "special-defense",
            label: "Spezial-Verteidigung",
            value: 0,
            color: "bg-green-500",
          },
          {
            stat: "special-attack",
            label: "Spezial-Angriff",
            value: 0,
            color: "bg-blue-500",
          },
        ],
      }),
    );

    expect(markup).toContain(
      'data-stat="special-defense" class="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight" style="left:10%;top:72%;width:20%"><span>Spezial-Verteidigung</span><span class="block font-semibold tabular-nums">0</span></span>',
    );
    expect(markup).toContain("break-words text-center text-xs leading-tight");
  });

  it("colors the nature-increased and decreased stat labels without adding markers", () => {
    const markup = renderToStaticMarkup(
      createElement(EvRadarChart, {
        increasedStat: "hp",
        decreasedStat: "speed",
        stats: [
          { stat: "hp", label: "HP", value: 0, color: "bg-red-500" },
          { stat: "attack", label: "Attack", value: 0, color: "bg-orange-500" },
          { stat: "defense", label: "Defense", value: 0, color: "bg-yellow-500" },
          { stat: "speed", label: "Speed", value: 0, color: "bg-pink-500" },
          { stat: "special-defense", label: "Special Defense", value: 0, color: "bg-green-500" },
          { stat: "special-attack", label: "Special Attack", value: 0, color: "bg-blue-500" },
        ],
      }),
    );

    expect(markup).toContain(
      'data-stat="hp" data-nature-effect="up" class="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight font-semibold text-red-600 dark:text-red-400"',
    );
    expect(markup).toContain(
      'data-stat="speed" data-nature-effect="down" class="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight font-semibold text-blue-700 dark:text-blue-400"',
    );
    expect(markup.match(/data-nature-effect=/g)).toHaveLength(2);
    expect(markup).not.toContain("items-center justify-center rounded-full text-white");
    expect(markup).not.toContain("<path");
  });

  it("uses theme-aware green for chart values and isolates each chart", () => {
    const stats = [
      { stat: "hp", label: "HP", value: 4, color: "bg-red-500" },
      { stat: "attack", label: "Attack", value: 252, color: "bg-orange-500" },
      { stat: "defense", label: "Defense", value: 0, color: "bg-yellow-500" },
      { stat: "speed", label: "Speed", value: 252, color: "bg-pink-500" },
      {
        stat: "special-defense",
        label: "Special Defense",
        value: 0,
        color: "bg-green-500",
      },
      {
        stat: "special-attack",
        label: "Special Attack",
        value: 0,
        color: "bg-blue-500",
      },
    ];
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(EvRadarChart, { stats }),
        createElement(EvRadarChart, { stats }),
      ),
    );
    const sectorColors = [
      ...markup.matchAll(
        /<polygon(?=[^>]*fill-opacity="0\.4")[^>]*fill="([^"]+)"/g,
      ),
    ].map(([, color]) => color);
    const evTriangleColors = [
      ...markup.matchAll(/data-ev-stat="[^"]+" data-ev-value="[^"]+"[^>]*fill="([^"]+)"/g),
    ].map(([, color]) => color);
    const clipAreas = [
      ...markup.matchAll(/<clipPath id="[^"]+">([\s\S]*?)<\/clipPath>/g),
    ].map(([, contents]) => contents);
    const clipIds = [...markup.matchAll(/<clipPath id="([^"]+)"/g)].map(
      ([, id]) => id,
    );

    expect(sectorColors).toEqual([
      ...Array(12).fill("currentColor"),
    ]);
    expect(evTriangleColors).toEqual([
      ...Array(6).fill("currentColor"),
    ]);
    expect(clipAreas.map((contents) => (contents.match(/<polygon/g) ?? []).length)).toEqual([
      1,
      1,
    ]);
    expect(markup.match(/<line[^>]*stroke="currentColor"/g)).toHaveLength(8);
    expect(markup.match(/<circle\b/g)).toHaveLength(6);
    expect(markup.match(/fill="currentColor"/g)).toHaveLength(24);
    expect(markup.match(/text-\[#047857\] dark:text-\[#6ee7b7\]/g)).toHaveLength(2);
    expect(markup.match(/data-nature-effect=/g)).toBeNull();
    expect(clipIds).toHaveLength(2);
    expect(new Set(clipIds).size).toBe(clipIds.length);
  });

  it("can display calculated stats without changing the EV chart geometry", () => {
    const stats = [
      { stat: "hp", label: "HP", value: 4, color: "bg-red-500", displayValue: 302 },
      { stat: "attack", label: "Attack", value: 252, color: "bg-orange-500", displayValue: 359 },
      { stat: "defense", label: "Defense", value: 0, color: "bg-yellow-500", displayValue: 196 },
      { stat: "speed", label: "Speed", value: 252, color: "bg-pink-500", displayValue: 328 },
      { stat: "special-defense", label: "Special Defense", value: 0, color: "bg-green-500", displayValue: 196 },
      { stat: "special-attack", label: "Special Attack", value: 0, color: "bg-blue-500", displayValue: 140 },
    ];
    const calculatedMarkup = renderToStaticMarkup(
      createElement(EvRadarChart, { stats }),
    );
    const evMarkup = renderToStaticMarkup(
      createElement(EvRadarChart, {
        stats: stats.map(({ stat, label, value, color }) => ({
          stat,
          label,
          value,
          color,
        })),
      }),
    );
    const geometry = (markup: string) =>
      [...markup.matchAll(/data-ev-stat="([^"]+)" data-ev-value="(\d+)" points="([^"]+)"/g)];

    expect(calculatedMarkup).toContain(
      '<span class="block font-semibold tabular-nums">302</span>',
    );
    expect(calculatedMarkup).toContain(
      'data-ev-stat="attack" data-ev-value="252"',
    );
    expect(geometry(calculatedMarkup).map(([, stat, value, points]) => [stat, value, points])).toEqual(
      geometry(evMarkup).map(([, stat, value, points]) => [stat, value, points]),
    );
    expect(calculatedMarkup).not.toContain(
      '<span class="block font-semibold tabular-nums">4</span>',
    );
  });
});