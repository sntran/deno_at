/**
 * Schedules commands to be executed once, at a particular time in the future.
 *
 * The commands are executed at a later time, using `fetch`.
 */

const PREFIX = "jobs";
const DATABASE_URL = Deno.env.get("DATABASE_URL");
const db = await Deno.openKv(DATABASE_URL);

db.listenQueue(async (job: unknown) => {
  const { id, queue } = job as { id: number, queue: string };
  const key = [PREFIX, `${queue}:${id}`];
  const { value: request } = await db.get<Request>(key);
  if (!request) return;

  // Reconstructs the serialized request.
  const { url, ...init} = request;
  // Executes the job and closes response body.
  fetch(url, init).then((response) => response.body?.cancel());
  // Removes the job from the database.
  await db.delete(key);
});

/**
 * Parses the time string to Date.
 *
 * @param {string} time - The time string to parse
 * @returns {Date}
 */
function parseTime(time: string): Date {
  return new Date(time);
}

/**
 * Adds a job to be executed at specific time.
 *
 * Each jobs will have an auto-incremented number as ID in the job queue.
 * Note: Job number starts at 0.
 *
 * @param {string|URL|Request} request - The request to be executed
 * @returns {number} - The job number
 */
export async function at(request: string|URL|Request, time: string, queue = "a"): Promise<number | null> {
  if (typeof request === "string") {
    request = new URL(request);
  }
  request = new Request(request);
  // Serialize the request to be stored in the database.
  const { url, method, headers, body } = request;

  const date = parseTime(time);
  const expireIn = date.getTime() - Date.now();

  headers.set("Date", date.toUTCString());
  const job = { url, method, headers: Object.fromEntries(headers), body };

  const idKey = [PREFIX, "size"];
  let id = null;

  // Retry the transaction until it succeeds.
  let res = { ok: false };
  while (!res.ok) {
    // Gets the current job id
    const idRes = await db.get<number>(idKey);
    id = Number(idRes.value);
    const jobKey = [PREFIX, `${queue}:${id}`];

    res = await db.atomic()
      .check(idRes) // Ensures the current job ID has not changed.
      .check({ key: jobKey, versionstamp: null }) // Ensures the job does not exist.
      .set(jobKey, job, { expireIn }) // Stores the job by its number
      .enqueue({ id, queue }, { delay: expireIn }) // Adds the job to the queue for execution
      .sum(idKey, 1n) // Increments the job ID
      .commit();
  }

  return id;
}

/**
 * Lists the user's pending jobs
 *
 * If the user is the superuser, everybody's jobs are listed.
 */
export async function atq(queue?: string) {
  const start = [PREFIX];
  if (queue) {
    start.push(`${queue}:`);
  }
  const entries = await db.list<Request>({
    prefix: [PREFIX],
    start,
  });

  const jobs: Request[] = [];

  for await (const { key, value } of entries) {
    const [, id] = key;
    if (id === "size") continue;
    const { url, ...init } = value;
    jobs.push(new Request(url, init));
  }

  return jobs;
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {

}
