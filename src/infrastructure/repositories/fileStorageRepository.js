import { supabase } from '../../supabase.js'

export async function createSignedFileUrl(bucket, path, expiresIn = 3600) {
  if (!bucket || !path) return null

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data?.signedUrl ?? null
}

export async function uploadFile(bucket, path, file, options = {}) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options)

  if (error) throw error
  return path
}

export async function removeFiles(bucket, paths) {
  const cleanPaths = (Array.isArray(paths) ? paths : [paths]).filter(Boolean)
  if (!cleanPaths.length) return

  const { error } = await supabase.storage
    .from(bucket)
    .remove(cleanPaths)

  if (error) throw error
}
