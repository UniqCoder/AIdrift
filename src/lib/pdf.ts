import { extractText, getDocumentProxy } from "unpdf";

// Extracts text from an untrusted PDF with pdf.js (via unpdf). Text is data for the agent, never instructions to DRIFTVEIL.
export async function extractPdf(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  if (bytes.length > 512 * 1024) throw new Error("PDF exceeds the 512 KiB demo limit.");
  const pdf = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: text.slice(0, 200000), pages: totalPages };
}
