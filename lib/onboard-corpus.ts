import { loadCorpusChunks } from "./corpus";
import { selectedOnboardDocs, type OnboardConfig } from "./onboard";

/** Pages selected for this client. Server-only: it reads the sample folders. */
export async function loadOnboardChunks(config: OnboardConfig) {
  const selected = selectedOnboardDocs(config);
  const dirs = [...new Set(selected.map((doc) => doc.dir))];
  const groups = await Promise.all(
    dirs.map(async (dir) => ({
      dir,
      chunks: await loadCorpusChunks({ dir }),
    })),
  );
  const filesByDir = new Map<string, Set<string>>();
  for (const doc of selected) {
    const files = filesByDir.get(doc.dir) ?? new Set<string>();
    files.add(doc.file);
    filesByDir.set(doc.dir, files);
  }
  return groups.flatMap((group) => {
    const files = filesByDir.get(group.dir) ?? new Set<string>();
    return group.chunks.filter((chunk) => files.has(chunk.source));
  });
}
