import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  getJobStatus,
  getPollingUrlFromJobId,
  initAdobeDocumentService,
  initAzureContainerClient,
  JobStatus,
} from "../internalApi";
import { CreatePDFResult } from "@adobe/pdfservices-node-sdk";
import { Readable } from "stream";
import { BlobSASPermissions, SASProtocol } from "@azure/storage-blob";

export async function result(
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

  if ((await getJobStatus(jobId)) === JobStatus.DONE) {
    const pollingURL = await getPollingUrlFromJobId(jobId);
    const pdfService = await initAdobeDocumentService();
    try {
      const pdfServicesResponse = await pdfService.getJobResult({
        pollingURL,
        resultType: CreatePDFResult,
      });
      const resultAsset = pdfServicesResponse.result.asset;
      const streamAsset = await pdfService.getContent({ asset: resultAsset });

      const containerClient = await initAzureContainerClient();
      const blobClient = containerClient.getBlockBlobClient(jobId + ".pdf");
      const blobResponse = await blobClient.uploadStream(
        Readable.from(streamAsset.readStream)
      );
      const escapedUrl = encodeURIComponent(
        await blobClient.generateSasUrl({
          protocol: SASProtocol.Https,
          permissions: BlobSASPermissions.from({
            read: true,
            write: false,
            delete: false,
            add: false,
            create: false,
            deleteVersion: false,
            tag: false,
            move: false,
            execute: false,
            setImmutabilityPolicy: false,
            permanentDelete: false,
          }),
          expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
      );
      return {
        status: 200,
        body: JSON.stringify({
          status: JobStatus.DONE,
          fileUrl: escapedUrl,
        }),
      };
    } catch (err) {
      return {
        status: 500,
        body: JSON.stringify({
          errorMessage: err.message,
          error: "Failed to get job result",
        }),
      };
    }
  }
}

app.http("result", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: result,
});
