/** Raw PokéAPI response shapes. Internal: only the parts that are read. */

import type { PokemonMovesResponse } from "../learnsets";
import type { PokemonForm } from "./types";

export type PokemonResponse = {
  id: number;
  name: string;
  height: number;
  weight: number;
  cries?: { latest?: string | null; legacy?: string | null };
  types: { slot: number; type: { name: string } }[];
  abilities: {
    slot: number;
    is_hidden: boolean;
    ability: { name: string };
  }[];
  stats: { base_stat: number; stat: { name: string } }[];
  /** Only used for the list of games; the moves themselves load separately. */
  moves?: PokemonMovesResponse["moves"];
  forms?: { name: string; url: string }[];
  past_stats?: {
    generation: { url: string };
    stats: { base_stat: number; stat: { name: string } }[];
  }[];
  past_abilities?: {
    generation: { url: string };
    abilities: {
      slot: number;
      is_hidden: boolean;
      ability: { name: string } | null;
    }[];
  }[];
  past_types?: {
    generation: { url: string };
    types: { slot: number; type: { name: string } }[];
  }[];
  sprites: {
    front_default: string | null;
    front_shiny?: string | null;
    versions?: Record<
      string,
      Record<
        string,
        { front_default?: string | null; front_shiny?: string | null }
      >
    >;
    other?: {
      home?: {
        front_default?: string | null;
        front_shiny?: string | null;
      };
      "official-artwork"?: {
        front_default: string | null;
        front_shiny?: string | null;
      };
    };
  };
};

export type NameEntry = { name: string; language: { name: string } };

export type PokemonFormResponse = { form_names: NameEntry[] };

export type PokemonFormResourceResponse = PokemonFormResponse & {
  id: number;
  name: string;
  is_default: boolean;
  pokemon: { name: string; url: string };
  types: PokemonResponse["types"];
  sprites: PokemonResponse["sprites"];
};

export type PokemonFormSelection = {
  form: PokemonForm;
  pokemonId: number;
  pokemon?: PokemonResponse;
  formResourceId?: number;
};

export type FlavorTextEntry = {
  flavor_text: string;
  language: { name: string };
  version?: { name: string };
};

export type SpeciesResponse = {
  id: number;
  name: string;
  names: NameEntry[];
  flavor_text_entries: FlavorTextEntry[];
  gender_rate: number;
  genera: { genus: string; language: { name: string } }[];
  evolution_chain: { url: string };
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
};

export type RefResponse = { name: string } | null;

export type EvolutionDetailResponse = {
  min_level: number | null;
  item: RefResponse;
  trigger: { name: string };
  version_group?: { name: string } | null;
  is_default?: boolean;
  held_item?: RefResponse;
  known_move?: RefResponse;
  known_move_type?: RefResponse;
  used_move?: RefResponse;
  location?: RefResponse;
  party_type?: RefResponse;
  party_species?: RefResponse;
  trade_species?: RefResponse;
  region?: RefResponse;
  required_pokemon_form?: RefResponse;
  evolved_pokemon_form?: RefResponse;
  time_of_day?: string;
  min_move_count?: number | null;
  min_happiness?: number | null;
  min_affection?: number | null;
  min_beauty?: number | null;
  min_steps?: number | null;
  min_damage_taken?: number | null;
  gender?: number | null;
  relative_physical_stats?: number | null;
  near_special_rock?: boolean;
  needs_overworld_rain?: boolean;
  needs_multiplayer?: boolean;
  turn_upside_down?: boolean;
};

export type ChainLinkResponse = {
  species: { name: string; url: string };
  evolution_details: EvolutionDetailResponse[];
  evolves_to: ChainLinkResponse[];
};

export type EvolutionChainResponse = { chain: ChainLinkResponse };

export type AbilityResponse = {
  names: NameEntry[];
  effect_entries: {
    effect: string;
    short_effect: string;
    language: { name: string };
  }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version_group?: { name: string };
  }[];
};
