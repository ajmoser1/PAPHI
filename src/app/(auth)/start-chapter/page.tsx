import type { Metadata } from 'next'
import { StartChapterForm } from './StartChapterForm'

export const metadata: Metadata = { title: 'Start a chapter' }

export default function StartChapterPage() {
  return <StartChapterForm />
}
