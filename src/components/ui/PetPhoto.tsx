import { useEffect, useState } from 'react'
import { getPetPhotoUrl } from '../../lib/api'

interface PetPhotoProps {
  path: string | null | undefined
  alt: string
  className?: string
  fallback?: React.ReactNode
}

/**
 * Renders a pet photo from a private Supabase Storage bucket.
 * Automatically fetches a 1-hour signed URL from the stored path.
 */
export function PetPhoto({ path, alt, className, fallback }: PetPhotoProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) return
    // If it's already a full URL (legacy data), use it directly
    if (path.startsWith('http')) {
      setUrl(path)
      return
    }
    getPetPhotoUrl(path).then(setUrl)
  }, [path])

  if (!url) return <>{fallback ?? null}</>
  return <img src={url} alt={alt} className={className} />
}
