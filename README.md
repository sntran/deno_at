# Deno AT

An experimental port of `at` command in Deno using `Deno.Kv` as a storage and
queue.

## Why?

Mostly, to try out `Deno.Kv` and its new queue API (`enqueue` and
`listenQueue`).

There is one advantage of using this 50+MB library over 100+KB `at` command is
that it delegates the job execution to a remote service instead of running it
locally. This means that we can run the job on a different machine, or even a
different architecture.

For example, one can have it executes a Deno Deploy instance, in which they can
control the execution environment (e.g. memory limit, CPU limit, variables,
etc.) and the job can be executed in a sandboxed environment.

## Playground

https://dash.deno.com/playground/atd

## Usage

```typescript
import { at, atq, atrm } from "https://raw.githubusercontent.com/sntran/deno_at/main/main.ts";

// Fetches "https://example.com" in 10 seconds
const time = new Date(Date.now() + 10000).toISOString();
const id = await at("https://example.com", time, "a");
console.log(id); // 0
const [job] = await atq();
console.log(job.id); // 0
await atrm(job.id);
const jobs = await atq("a");
console.log(jobs.length); // 0
```

There is also a CLI similar to `at` command.

```shell
$ echo "https://example.com" | deno run --unstable -A ./main.ts -t 2023-12-31T23:59:59
$ deno run --unstable -A ./main.ts -l
$ deno run --unstable -A ./main.ts -r 0
```

## Development

Install `deno` if you haven't already:

```shell
curl -fsSL https://deno.land/x/install/install.sh | sh
```

Clone the repo:

```shell
git clone https://github.com/sntran/deno_at.git
```

### Notes

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
