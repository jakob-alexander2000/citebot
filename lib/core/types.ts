import type { Locale } from "../locale";

export type Collection = "handbook" | "phone" | "upload";

export type IndexedChunk = {
  id: string;
  collection: Collection;
  source: string;
  title: string;
  headingPath: string[];
  text: string;
  indexText: string;
  context: string;
  contextSource: "mock" | "workers-ai" | "deterministic";
  lang?: Locale;
  embedding: number[] | null;
};

export type RawChunk = {
  id: string;
  collection: Collection;
  source: string;
  title: string;
  headingPath: string[];
  text: string;
  lang?: Locale;
};
