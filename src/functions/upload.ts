import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { Readable } from "stream";
import { v1 as uuidv1 } from "uuid";
require("dotenv").config();

export async function uploadFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    if (!request.body) {
        return {
            status: 400,
            body: "Please pass a file in the request body"
        };
    }

    const fileId = uuidv1();
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("docx-files");
    const blobClient = containerClient.getBlockBlobClient(fileId + ".docx");

    const uploadBlobResponse = await blobClient.uploadStream(Readable.from(request.body));

    if (uploadBlobResponse._response.status !== 201) {
        return {
            status: 500,
            body: `Failed to upload file. Status code: ${uploadBlobResponse._response.status}`
        };
    }

    return {
        status: 200,
        body: `File uploaded successfully. File Id: ${fileId}`
    };
};

app.http('upload', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: uploadFunction
});
