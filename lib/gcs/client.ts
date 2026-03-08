import { Storage } from '@google-cloud/storage';

// GCS認証情報の取得
const getCredentials = () => {
  const credentialsString = process.env.GCS_CREDENTIALS;

  if (!credentialsString) {
    throw new Error('GCS_CREDENTIALS environment variable is not set');
  }

  try {
    return JSON.parse(credentialsString);
  } catch (error) {
    throw new Error('Invalid GCS_CREDENTIALS format. Must be valid JSON');
  }
};

// GCS Storage インスタンスの作成
export const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: getCredentials(),
});

export const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME environment variable is not set');
}

export const bucket = storage.bucket(bucketName);
