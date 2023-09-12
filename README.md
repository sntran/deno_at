# Deno AT

An experimental port of `at` command in Deno using `Deno.Kv` as a storage and
queue.

## Usage

```typescript
import { at, atd, atrm } from "./main.ts";

// Fetches "https://example.com" in 10 seconds
const time = new Date(Date.now() + 10000).toISOString();
const id = await at("https://example.com", time, "a");
console.log(id); // 0
const [job] = await atd();
console.log(job.id); // 0
await atrm(job.id);
const jobs = await atd("a");
console.log(jobs.length); // 0
```

There is also a CLI similar to `at` command.

```shell
$ echo "https://example.com" | deno run --unstable -A ./main.ts -t 2023-12-31T23:59:59
$ deno run --unstable -A ./main.ts -l
$ deno run --unstable -A ./main.ts -r 0
```

## Notes

- `listenQueue` works well offline, so we can have the CLI that works without
  daemon.
- `at` uses auto-incremented number as job ID. Because we don't keep the jobs
  after it expires, we have to keep a second key for such IDs.
- `listenQueue` does not take type of the received message, so we have to cast
  it.
- Can't dequeue a message from a queue so we have to check if the associated key
  was deleted.
- Can't know when the job is supposed to start, so we have to store the start
  time in the job itself.
- No `deleteMany`.
- `getMany` only allows 10 keys.
