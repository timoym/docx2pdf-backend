import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  CreatePDFJob,
  CreatePDFResult,
  PDFServices,
  SDKError,
  MimeType,
  ServiceApiError,
  ServicePrincipalCredentials,
  ServiceUsageError,
} from "@adobe/pdfservices-node-sdk";
import {
  JobStatus,
  getJobStatus,
  initAdobeDocumentService,
} from "../internalApi";

function getPollingUrlFromJobId(jobId: string): string {
  //TODO Query DB for the polling URL
  return `https://document-service.adobe.io/jobs/${jobId}`;
}

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
        pollingURL: getPollingUrlFromJobId(jobId),
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
