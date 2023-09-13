import { at, atq, atrm } from "./main.ts";

Deno.bench("at", async () => {
  await at(
    "https://example.com",
    new Date(Date.now() + 5000).toISOString(),
    "z",
  );
});

Deno.bench("atq", async () => {
  await atq("z");
});

Deno.bench("atrm(0)", async () => {
  await atrm(0);
});
Deno.bench("atrm(1, 2, 3, 4, 5)", async () => {
  await atrm(1, 2, 3, 4, 5);
});
