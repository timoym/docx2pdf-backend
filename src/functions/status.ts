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

function getPollingUrlFromJobId(jobId: string): string {
  //TODO Query DB for the polling URL
  return `https://document-service.adobe.io/jobs/${jobId}`;
}

export async function status(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const jobId = request.query.get("jobId");
  const credentials = new ServicePrincipalCredentials({
    clientId: process.env.PDF_SERVICES_CLIENT_ID,
    clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
  });
  const pdfServices = new PDFServices({ credentials });
  const pdfServicesResponse = pdfServices.getJobStatus({
    pollingURL: getPollingUrlFromJobId(jobId)
  });

  //TODO Convert adobe status to my status


  return { body: `Hello, meme!` };
}

app.http("status", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: status,
});
