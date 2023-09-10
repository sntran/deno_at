/**
 * Schedules commands to be executed once, at a particular time in the future.
 *
 * The commands are executed at a later time, using `fetch`.
 */

const PREFIX = "jobs";
const DATABASE_URL = Deno.env.get("DATABASE_URL");
const db = await Deno.openKv(DATABASE_URL);

db.listenQueue((request: unknown) => {
  // Reconstructs the serialized request.
  const { url, ...init} = request as Request;
  // Executes the job and closes response body.
  fetch(url, init).then((response) => response.body?.cancel());
});

/**
 * Parses the time string to timestamp.
 *
 * @param {string} time - The time string to parse
 * @returns {number} The timestamp
 */
function parseTime(time: string): number {
  const timestamp = new Date(time).getTime();
  return timestamp;
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
  const job = { url, method, headers, body };

  const idKey = [PREFIX, "size"];
  let jobId = null;
  const expireIn = parseTime(time) - Date.now();

  // Retry the transaction until it succeeds.
  let res = { ok: false };
  while (!res.ok) {
    // Gets the current job id
    const idRes = await db.get<number>(idKey);
    jobId = Number(idRes.value);

    res = await db.atomic()
      .check(idRes) // Ensures the current job ID has not changed.
      .enqueue(job, { delay: expireIn }) // Adds the job to the queue for execution
      .sum(idKey, 1n) // Increments the job ID
      .commit();
  }

  return jobId;
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {

}
