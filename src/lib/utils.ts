import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The heading-* utilities set size, line-height, weight, family and tracking,
// so a later heading-* must strip the primitives' text-*/leading-*/font-* classes.
const twMerge = extendTailwindMerge<"heading">({
  extend: {
    classGroups: {
      heading: ['heading-display', 'heading-1', 'heading-2', 'heading-3', 'heading-4'],
    },
    conflictingClassGroups: {
      heading: ['font-size', 'leading', 'font-weight', 'font-family', 'tracking'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
