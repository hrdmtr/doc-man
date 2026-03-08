import pdf from 'pdf-parse';

export interface ParsedPDFData {
  text: string;
  numPages: number;
  info: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  };
}

/**
 * PDFファイルを解析してテキストを抽出
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedPDFData> {
  try {
    const data = await pdf(buffer);

    return {
      text: data.text,
      numPages: data.numpages,
      info: {
        Title: data.info?.Title,
        Author: data.info?.Author,
        Subject: data.info?.Subject,
        Creator: data.info?.Creator,
        Producer: data.info?.Producer,
        CreationDate: data.info?.CreationDate,
        ModDate: data.info?.ModDate,
      },
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
