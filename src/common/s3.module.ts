import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3UploadService } from './services/s3-upload.service';

@Module({
  imports: [ConfigModule],
  providers: [S3UploadService],
  exports: [S3UploadService],
})
export class S3Module {}
