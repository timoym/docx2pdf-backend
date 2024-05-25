import * as sql from "mssql";
import { env } from "process";
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
import { BlobServiceClient } from "@azure/storage-blob";
import { v1 as uuidv1 } from "uuid";

export enum JobStatus {
  IN_PROGRESS = "inprogress",
  DONE = "done",
  FAILED = "failed",
  UNKNOWN = "unknown",
}

async function createDbPool() {
  return await sql.connect(env.DB_CONNECTION_STRING);
}

export async function initAdobeDocumentService() {
  const credentials = new ServicePrincipalCredentials({
    clientId: process.env.PDF_SERVICES_CLIENT_ID,
    clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
  });

  return new PDFServices({ credentials });
}

export async function initAzureContainerClient() {
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!containerName || !connectionString) {
    throw new Error(
      "Azure Storage container name and connection string must be provided"
    );
  }
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);

  return blobServiceClient.getContainerClient(containerName);
}

export async function getPollingUrlFromJobId(jobId: string): Promise<string> {
  try {
    const pool = await createDbPool();
    const result = await pool
      .request()
      .query(`SELECT statusLink FROM dbo.conversionJobs WHERE Id = '${jobId}'`);
    //check if job exists
    if (result.recordset.length === 0) {
      return "";
    }
    return result.recordset[0].statusLink;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  try {
    const pool = await createDbPool();
    const result = await pool
      .request()
      .query(`SELECT status FROM dbo.conversionJobs WHERE Id = '${jobId}'`);
    //check if job exists
    if (result.recordset.length === 0) {
      return JobStatus.UNKNOWN;
    }
    return result.recordset[0].status;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus
): Promise<void> {
  try {
    const pool = await createDbPool();
    const result = await pool
      .request()
      .query(
        `UPDATE dbo.conversionJobs SET status = '${status}' WHERE Id = '${jobId}'`
      );
    if (result.rowsAffected.length === 0) {
      throw new Error("Failed to update job status");
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function getJobStatusAdobe(
  jobId: string
): Promise<JobStatus | undefined> {
  try {
    const pdfService = await initAdobeDocumentService();
    const pollingURL = await getPollingUrlFromJobId(jobId);
    if (!pollingURL) {
      return undefined;
    }
    const jobStatus = (
      await pdfService.getJobStatus({
        pollingURL,
      })
    ).status as JobStatus;
    return jobStatus;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function createJob(
  fileId: string,
  statusLink: string
): Promise<string> {
  try {
    const jobId = uuidv1();
    const pool = await createDbPool();
    const result = await pool
      .request()
      .query(
        `INSERT INTO dbo.conversionJobs (Id, fileId, statusLink, status) VALUES ('${jobId}', '${fileId}', '${statusLink}', '${JobStatus.IN_PROGRESS}')`
      );
    if (result.rowsAffected.length === 0) {
      throw new Error("Failed to create job");
    }
    return jobId;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
