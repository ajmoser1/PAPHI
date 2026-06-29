'use server'

import Anthropic from '@anthropic-ai/sdk'

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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { message: 'Anthropic API key is not configured.' }

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const client = new Anthropic({ apiKey })

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
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { message: 'No response from Claude.' }
    }

    raw = textBlock.text.trim()
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to contact Claude API.'
    return { message }
  }

  try {
    const positions: ExtractedPosition[] = JSON.parse(raw)
    if (!Array.isArray(positions)) return { message: 'Unexpected response from Claude.' }
    return { positions }
  } catch {
    return { message: 'Could not parse positions from PDF. Make sure it is a LinkedIn profile export.' }
  }
}
