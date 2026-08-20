import { supabase } from '../supabase'

export async function uploadArticleImage(file) {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('articles').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('articles').getPublicUrl(path)
  return data.publicUrl
}
