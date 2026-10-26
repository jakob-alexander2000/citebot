export type Chunk = {
  id: string;
  source: string;
  title: string;
  text: string;
};

export type EmbeddedChunk = Chunk & {
  embedding: number[];
};

export type Citation = {
  id: string;
  source: string;
  title: string;
  snippet: string;
  score: number;
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
};
