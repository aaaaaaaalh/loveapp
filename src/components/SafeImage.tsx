import { useState, type ImgHTMLAttributes } from 'react'
import { assetUrl } from '../utils/assetUrl'

export function SafeImage({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState<string | undefined>()
  return <img {...props} alt={alt} src={assetUrl(!src || failed === src ? '/images/gift-placeholder.svg' : src)} onError={() => { if (src && failed !== src) setFailed(src) }} />
}
