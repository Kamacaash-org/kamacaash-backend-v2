import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class S3UploadService {
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly publicBaseUrl?: string;
  private readonly s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId =
      this.configService.get<string>('S3_ACCESS_KEY_ID') ||
      this.configService.get<string>('AWS_ACCESS_KEY_ID') ||
      '';
    const secretAccessKey =
      this.configService.get<string>('S3_SECRET_ACCESS_KEY') ||
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ||
      '';
    this.bucket =
      this.configService.get<string>('S3_BUCKET') ||
      this.configService.get<string>('AWS_S3_BUCKET_NAME')?.trim() ||
      '';
    this.region =
      this.configService.get<string>('S3_REGION') ||
      this.configService.get<string>('AWS_REGION') ||
      'us-east-1';
    this.endpoint = this.configService.get<string>('S3_ENDPOINT') || undefined;
    this.publicBaseUrl =
      this.configService.get<string>('S3_PUBLIC_BASE_URL') || undefined;
    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    this.s3 = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file || !file.buffer) {
      throw new InternalServerErrorException('Invalid upload file payload');
    }
    if (!this.bucket) {
      throw new InternalServerErrorException('S3_BUCKET is not configured');
    }

    const extension = extname(file.originalname || '');
    const safeFolder = folder.replace(/^\/+|\/+$/g, '');
    const key = `${safeFolder}/${Date.now()}-${randomUUID()}${extension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
      }),
    );

    return this.buildPublicUrl(key);
  }

  async uploadFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<string[]> {
    if (!files?.length) return [];
    const urls = await Promise.all(
      files.map((file) => this.uploadFile(file, folder)),
    );
    return urls;
  }

  async deleteByUrl(url?: string | null): Promise<void> {
    if (!url) return;
    if (!this.bucket) return;

    const key = this.extractKeyFromUrl(url);
    if (!key) return;

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async deleteManyByUrls(urls?: Array<string | null | undefined>): Promise<void> {
    if (!urls?.length) return;
    await Promise.all(urls.map((url) => this.deleteByUrl(url)));
  }

  private buildPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    }

    if (this.endpoint) {
      const normalized = this.endpoint.replace(/\/+$/, '');
      return `${normalized}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private extractKeyFromUrl(fileUrl: string): string | null {
    try {
      const parsed = new URL(fileUrl);
      const path = parsed.pathname.replace(/^\/+/, '');
      const host = parsed.host;

      if (this.publicBaseUrl) {
        const base = new URL(this.publicBaseUrl);
        if (base.host === host) {
          return path;
        }
      }

      if (this.endpoint) {
        const endpointHost = new URL(this.endpoint).host;
        if (endpointHost === host) {
          const bucketPrefix = `${this.bucket}/`;
          return path.startsWith(bucketPrefix) ? path.slice(bucketPrefix.length) : path;
        }
      }

      if (host.includes('.s3.') && path.startsWith(`${this.bucket}/`)) {
        return path.slice(this.bucket.length + 1);
      }

      if (host.startsWith(`${this.bucket}.s3.`)) {
        return path;
      }

      return path || null;
    } catch {
      return null;
    }
  }
}
