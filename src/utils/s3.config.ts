import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { AppError } from './classError';
export const s3Client = () => new S3Client({ region: process.env.AWS_REGION! });
const keyFor = (path: string, name: string) => (process.env.APPLICATION_NAME || 'social-media') + '/' + path + '/' + randomUUID() + '_' + basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
export async function uploadFile({ path, file }: { path: string; file: Express.Multer.File }) {
  if (!file || !file.buffer?.length) throw new AppError('File required', 400);
  const Key = keyFor(path, file.originalname);
  await s3Client().send(new PutObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME!, Key, Body: file.buffer, ContentType: file.mimetype }));
  return Key;
}
export const uploadLargeFile = uploadFile;
export async function uploadFiles({ path, files }: { path: string; files: Express.Multer.File[] }) {
  const results = await Promise.allSettled(files.map(file => uploadFile({ path, file })));
  const keys = results.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled').map(r => r.value);
  const failed = results.find(r => r.status === 'rejected');
  if (failed) { await deleteFiles({ urls: keys }); throw (failed as PromiseRejectedResult).reason; }
  return keys;
}
export async function createUploadFilePreSignedUrl({ path, originalname, ContentType, expiresIn = 300 }: { path: string; originalname: string; ContentType: string; expiresIn?: number }) {
  const Key = keyFor(path, originalname);
  const url = await getSignedUrl(s3Client(), new PutObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME!, Key, ContentType }), { expiresIn });
  return { url, Key };
}
export const getFile = ({ Key }: { Key: string }) => s3Client().send(new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME!, Key }));
export const headFile = ({ Key }: { Key: string }) => s3Client().send(new HeadObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME!, Key }));
export const deleteFile = ({ Key }: { Key: string }) => s3Client().send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME!, Key }));
export async function deleteFiles({ urls }: { urls: string[] }) {
  if (!urls.length) return;
  const result = await s3Client().send(new DeleteObjectsCommand({ Bucket: process.env.AWS_BUCKET_NAME!, Delete: { Objects: [...new Set(urls)].map(Key => ({ Key })) } }));
  if (result.Errors?.length) throw new AppError('Some uploaded files could not be removed', 502);
}
