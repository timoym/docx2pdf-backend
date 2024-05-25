import * as sql from "mssql";
import { env } from "process";

export enum JobStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  try {
    const pool = await sql.connect(env.DB_CONNECTION_STRING);
    const result = await pool
      .request()
      .query(`SELECT status FROM dbo.conversionJobs WHERE Id = '${jobId}'`);
    return result.recordset[0].status;
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
        const pool = await sql.connect(env.DB_CONNECTION_STRING);
        const result = await pool
        .request()
        .query(
            `INSERT INTO dbo.conversionJobs (fileId, status, statusLink) VALUES ('${fileId}', '${JobStatus.PENDING}', '${statusLink}')`
        );
        return result.recordset[0].status;
    } catch (err) {
        console.error(err);
        throw err;
    }
}
