export default function ArticleImage({ src, alt, className = '' }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-300 text-lg ${className}`}>
        🍗
      </div>
    )
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} />
}
