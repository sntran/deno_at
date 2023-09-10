import { assertEquals, assertNotEquals } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { at } from "./main.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Address = { hostname: string; port: number };

let lastRequestTimestamp: number;

// A simple server that updates last request's timestamp.
const { hostname, port } = await new Promise<Address>((onListen) => {
  Deno.serve({
    port: 0,
    onListen,
  }, (_request: Request) => {
    lastRequestTimestamp = Date.now();
    return new Response("ok");
  });
});

Deno.test("at", async (t) => {
  await t.step("should add jobs with auto-increased number", async () => {
    const now = new Date();
    const time = new Date(now.getTime() + 10).toISOString();

    let request: string|URL|Request, jobId: number | null;

    request = `http://${hostname}:${port}`;
    jobId = await at(request, time);
    assertEquals(jobId, 0, "should return the first job id with string request");

    request = new URL(request);
    jobId = await at(request, time);
    assertEquals(jobId, 1, "should return the second job id with URL request");

    request = new Request(request);
    jobId = await at(request, time);
    assertEquals(jobId, 2, "should return the third job id with Request request");

    const jobIds = [3, 4, 5, 6, 7, 8, 9, 10]
    assertEquals(
      await Promise.all(jobIds.map(() => at(request, time))),
      jobIds,
      "should return the next job ids in correct sequence"
    );
  });

  await t.step("should execute jobs at specified time", async () => {
    const date = lastRequestTimestamp;

    const now = new Date();
    const time = new Date(now.getTime() + 10);

    const request = new Request(`http://${hostname}:${port}`);
    await at(request, time.toISOString());

    assertEquals(
      lastRequestTimestamp, date,
      "should not change last timestamp before job is executed"
    );

    await sleep(time.getTime() - now.getTime());

    assertNotEquals(
      lastRequestTimestamp, date,
      "should reflect the timestamp after job is executed"
    );
  });
});
