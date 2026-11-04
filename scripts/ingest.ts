/**
 * Document embeddings are computed at request time by Workers AI when
 * CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set. This script does not
 * call a model vendor.
 */
console.log(
  "Nothing to precompute. The answer core embeds with @cf/baai/bge-m3 when Workers AI credentials are set, and skips the vector step otherwise.",
);
