import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  JobStatus,
  getJobStatus,
  getJobStatusAdobe,
  updateJobStatus,
} from "../internalApi";

export async function status(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const jobId = request.query.get("jobId");
  if (!jobId) {
    return {
      status: 400,
      body: JSON.stringify({
        error: "Missing jobId",
      }),
    };
  }
  let jobStatus = await getJobStatus(jobId);

  if (jobStatus === JobStatus.UNKNOWN) {
    return {
      status: 404,
      body: JSON.stringify({
        error: "Job not found",
      }),
    };
  }

  if (jobStatus === JobStatus.DONE) {
    return {
      status: 200,
      body: JSON.stringify({
        status: jobStatus,
      }),
    };
  }

  jobStatus = await getJobStatusAdobe(jobId);
  updateJobStatus(jobId, jobStatus);

  return {
    status: 200,
    body: JSON.stringify({
      status: jobStatus,
    }),
  };
}

app.http("status", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: status,
});
