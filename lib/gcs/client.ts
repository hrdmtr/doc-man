import { Storage } from '@google-cloud/storage';

// GCS認証情報の取得
const getCredentials = () => {
  const credentialsString = process.env.GCS_CREDENTIALS;

  if (!credentialsString) {
    // 開発時は環境変数未設定でもエラーにしない
    return null;
  }

  try {
    return JSON.parse(credentialsString);
  } catch (error) {
    console.error('Invalid GCS_CREDENTIALS format. Must be valid JSON');
    return null;
  }
};

const credentials = getCredentials();

// GCS Storage インスタンスの作成
export const storage = credentials
  ? new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials,
    })
  : null as any; // 環境変数未設定時はnull

export const bucketName = process.env.GCS_BUCKET_NAME || '';

export const bucket = storage && bucketName ? storage.bucket(bucketName) : null as any;
