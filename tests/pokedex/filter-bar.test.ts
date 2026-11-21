import {
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchField } from "@/components/pokedex/FilterBar";

function renderSearch(search: string) {
  return renderToStaticMarkup(
    createElement(SearchField, {
      search,
      label: "Search by name or number",
      clearLabel: "Clear search",
      onChange: () => {},
    }),
  );
}

describe("SearchField", () => {
  it("uses mobile-sized text to avoid browser zoom and hides the native clear control", () => {
    const markup = renderSearch("");

    expect(markup).toContain("text-base");
    expect(markup).toContain("md:text-sm");
    expect(markup).toContain('class="filter-search');
    expect(markup).not.toContain('aria-label="Clear search"');
  });

  it("shows a mobile clear button when the search has text", () => {
    const markup = renderSearch("pikachu");

    expect(markup).toContain('aria-label="Clear search"');
    expect(markup).toContain("md:hidden");
    expect(markup).toContain('<span aria-hidden="true">×</span>');
  });

  it("clears only the search filter when the button is pressed", () => {
    const onChange = vi.fn();
    const field = SearchField({
      search: "pikachu",
      label: "Search",
      clearLabel: "Clear search",
      onChange,
    });
    const children = (
      field as ReactElement<{ children: ReactNode[] }>
    ).props.children;
    const clearButton = children[1];

    expect(isValidElement<{ onClick: () => void }>(clearButton)).toBe(true);
    if (isValidElement<{ onClick: () => void }>(clearButton)) {
      clearButton.props.onClick();
    }

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ search: "" });
  });
});