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
import { JobStatus, getJobStatus } from "../dbApi";

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
        message: "Missing jobId",
      }),
    };
  }
  const jobStatus = await getJobStatus(jobId);

  /*
  const credentials = new ServicePrincipalCredentials({
    clientId: process.env.PDF_SERVICES_CLIENT_ID,
    clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
  });
  const pdfServices = new PDFServices({ credentials });
  const pdfServicesResponse = pdfServices.getJobStatus({
    pollingURL: getPollingUrlFromJobId(jobId),
  });
  */

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
