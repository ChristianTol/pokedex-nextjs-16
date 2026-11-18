import { useLanguage } from "@/hooks/useLanguage";
import type { PokemonForm } from "@/lib/pokeapi/detail";
import { formatFormLabel } from "@/lib/pokedex/format";
import { SparkleIcon } from "./SparkleIcon";

type Props = {
  speciesName: string;
  forms: PokemonForm[];
  currentFormId: number;
  onSelect: (formId: number) => void;
  /** Whether the shiny version is shown; null when this form has none. */
  shiny: boolean | null;
  onToggleShiny: () => void;
};

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-selected";

export function FormPicker({
  speciesName,
  forms,
  currentFormId,
  onSelect,
  shiny,
  onToggleShiny,
}: Props) {
  const { t } = useLanguage();
  return (
    <section aria-label={t("detail.forms")} className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {t("detail.forms")}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {forms.length > 1 &&
          forms.map((form) => {
            const active = form.id === currentFormId;
            return (
              <li key={form.id}>
                <button
                  type="button"
                  onClick={() => onSelect(form.id)}
                  aria-pressed={active}
                  className={`${CHIP} ${
                    active
                      ? "border-selected bg-selected text-selected-text"
                      : "border-border hover:bg-surface-muted"
                  }`}
                >
                  {form.isDefault
                    ? t("detail.formDefault")
                    : formatFormLabel(speciesName, form.name)}
                </button>
              </li>
            );
          })}
        {shiny !== null && (
          <li>
            <button
              type="button"
              onClick={onToggleShiny}
              aria-pressed={shiny}
              className={`${CHIP} ${
                shiny
                  ? "border-selected bg-selected text-selected-text"
                  : "border-border hover:bg-surface-muted"
              }`}
            >
              <SparkleIcon />
              {t("detail.shiny")}
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
