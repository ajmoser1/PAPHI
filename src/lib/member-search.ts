export type MemberSearchSort = 'name' | 'class_asc' | 'class_desc' | 'chapter'

export function parseMemberSearchSort(value: string | undefined): MemberSearchSort {
  if (value === 'class_asc' || value === 'class_desc' || value === 'chapter' || value === 'name') {
    return value
  }
  return 'name'
}
