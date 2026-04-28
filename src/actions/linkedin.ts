'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ExtractedPosition {
  company_name: string
  title: string
  start_year: number | null
  end_year: number | null
  is_current: boolean
  industry: string | null
}

export async function parseLinkedInPdf(
  formData: FormData,
  industryNames: string[]
): Promise<{ positions?: ExtractedPosition[]; message?: string }> {
  const file = formData.get('pdf') as File
  if (!file || file.size === 0) return { message: 'No file provided.' }
  if (file.size > 20 * 1024 * 1024) return { message: 'PDF too large (max 20MB).' }
  if (file.type !== 'application/pdf') return { message: 'File must be a PDF.' }

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Extract all work experience positions from this LinkedIn profile PDF.
Return ONLY a valid JSON array — no markdown fences, no explanation. Each item:
{
  "company_name": string,
  "title": string,
  "start_year": number | null,
  "end_year": number | null,
  "is_current": boolean,
  "industry": one of [${industryNames.map((n) => `"${n}"`).join(', ')}] or null
}
If no positions are found return an empty array [].`

  let raw: string
  try {
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: 'application/pdf' } },
      prompt,
    ])
    raw = result.response.text().trim()
    // Strip markdown fences if the model adds them anyway
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  } catch (err: any) {
    return { message: err?.message ?? 'Failed to contact Gemini API.' }
  }

  try {
    const positions: ExtractedPosition[] = JSON.parse(raw)
    if (!Array.isArray(positions)) return { message: 'Unexpected response from Claude.' }
    return { positions }
  } catch {
    return { message: 'Could not parse positions from PDF. Make sure it is a LinkedIn profile export.' }
  }
}
