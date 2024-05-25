import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  SDKError,
  ServiceApiError,
  ServiceUsageError,
} from "@adobe/pdfservices-node-sdk";
import {
  JobStatus,
  getJobStatus,
  getPollingUrlFromJobId,
  initAdobeDocumentService,
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

  const pdfServices = await initAdobeDocumentService();
  try {
    jobStatus = (
      await pdfServices.getJobStatus({
        pollingURL: await getPollingUrlFromJobId(jobId),
      })
    ).status as JobStatus;
  } catch (err) {
    if (err instanceof SDKError) {
      if (err instanceof ServiceApiError) {
        return {
          status: 500,
          body: JSON.stringify({
            error: "Service API error",
          }),
        };
      } else if (err instanceof ServiceUsageError) {
        return {
          status: 500,
          body: JSON.stringify({
            error: "Service usage error",
          }),
        };
      }
    }
  }
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
