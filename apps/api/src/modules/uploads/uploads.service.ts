import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface PresignDto {
  filename: string;
  contentType: string;
  folder: string;
}

@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', '');
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', ''),
      },
      forcePathStyle: true,
    });
  }

  async presign(dto: PresignDto, userId: string) {
    const ext = path.extname(dto.filename).toLowerCase().replace(/^\./, '');
    const key = `uploads/${dto.folder}/${userId}/${uuidv4()}${ext ? '.' + ext : ''}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const publicUrl = `${this.publicUrl}/${key}`;

    return { uploadUrl, key, publicUrl };
  }
}
