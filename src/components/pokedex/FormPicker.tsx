import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type {
  PokemonForm,
  PokemonFormSprites,
} from "@/lib/pokeapi/detail";
import { formatFormLabel, formatName } from "@/lib/pokedex/format";
import { formSpriteCandidates } from "@/lib/pokedex/game-detail";
import { SparkleIcon } from "./SparkleIcon";

type Props = {
  speciesName: string;
  forms: PokemonForm[];
  sprites: PokemonFormSprites[];
  formDataLoading: boolean;
  game: string | null;
  showSprite: boolean;
  currentFormId: number;
  onSelect: (formId: number) => void;
  /** Whether the shiny version is shown; null when this form has none. */
  shiny: boolean | null;
  onToggleShiny: () => void;
};

const CHIP =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-selected";

function FormSpriteImage({
                           form,
                           game,
                           showSprite,
                           shiny,
                           fallbackToLatestGameSprite,
                         }: {
  form: PokemonFormSprites | undefined;
  game: string | null;
  showSprite: boolean;
  shiny: boolean;
  fallbackToLatestGameSprite: boolean;
}) {
  const [failedCount, setFailedCount] = useState(0);
  const candidates = form
      ? formSpriteCandidates(
          form,
          game,
          shiny,
          showSprite,
          fallbackToLatestGameSprite,
      )
      : [];
  const src = candidates[failedCount];
  if (!src) return null;
  return (
      <Image
          src={src}
          alt=""
          width={64}
          height={64}
          unoptimized
          className={`size-16 object-contain ${showSprite ? "[image-rendering:pixelated]" : ""}`}
          onError={() => setFailedCount((count) => count + 1)}
      />
  );
}

export function FormPicker({
                             speciesName,
                             forms,
                             sprites,
                             formDataLoading,
                             game,
                             showSprite,
                             currentFormId,
                             onSelect,
                             shiny,
                             onToggleShiny,
                           }: Props) {
  const { language, t, tOptional } = useLanguage();
  return (
      <section
          aria-label={t("detail.forms")}
          className="flex min-w-0 flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-muted">
            {t("detail.forms")}
          </h3>
          {shiny !== null && (
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
          )}
        </div>
        <ul
            tabIndex={forms.length > 3 ? 0 : undefined}
            className={`flex min-w-0 gap-2 focus-visible:outline-2 focus-visible:outline-selected ${
                forms.length > 3
                    ? "max-w-[18rem] flex-nowrap overflow-x-auto pb-1"
                    : "max-w-full flex-wrap"
            } sm:max-w-[21.5rem] sm:flex-nowrap sm:overflow-x-auto sm:pb-1`}
        >
          {forms.map((form) => {
            const active = form.id === currentFormId;
            const formSprites = sprites.find((sprite) => sprite.id === form.id);
            const formSuffix = form.name.startsWith(`${speciesName}-`)
                ? form.name.slice(speciesName.length + 1)
                : null;
            const formType =
                (speciesName === "arceus" || speciesName === "silvally") &&
                formSuffix &&
                !formSuffix.includes("-")
                ? tOptional(`type.${formSuffix}`)
                : null;
            const formattedLabel = formatFormLabel(
                speciesName,
                form.name,
                language,
                formSprites?.names,
            );
            const label =
                formType ??
                (speciesName === "unown"
                    ? `${formatName(speciesName)} ${formattedLabel}`
                    : form.isDefault
                        ? t("detail.formDefault")
                        : formattedLabel);
            return (
                <li
                    key={form.id}
                    className={`flex w-20 ${forms.length > 3 ? "shrink-0" : "sm:shrink-0"}`}
                >
                  <button
                      type="button"
                      onClick={() => onSelect(form.id)}
                      aria-label={label}
                      aria-pressed={active}
                      className="group flex w-full flex-col items-center gap-1.5 rounded-xl text-center text-xs focus-visible:outline-none"
                  >
                <span
                    aria-hidden="true"
                    className={`flex size-20 items-center justify-center overflow-hidden rounded-xl border-2 p-2 transition-colors group-focus-visible:border-dotted ${
                        active
                            ? "border-selected bg-surface-muted"
                            : "border-border hover:border-muted hover:bg-surface-muted"
                    }`}
                >
                  <FormSpriteImage
                      key={`${form.id}:${game ?? ""}:${shiny === true}:${showSprite}:${!active}`}
                      form={formSprites}
                      game={game}
                      showSprite={showSprite}
                      shiny={shiny === true}
                      fallbackToLatestGameSprite={!active}
                  />
                </span>
                    <span className="w-full break-words leading-tight">
                  {formDataLoading && !form.isDefault ? (
                      <span
                          aria-hidden="true"
                          className="skeleton mx-auto block h-4 w-16 rounded-md"
                      />
                  ) : (
                      label
                  )}
                </span>
                  </button>
                </li>
            );
          })}
        </ul>
      </section>
  );
}
