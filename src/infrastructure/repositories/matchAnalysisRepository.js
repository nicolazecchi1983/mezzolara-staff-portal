import { supabase } from '../../supabase.js'

export async function listMatchAnalysis() {
  const { data, error } = await supabase
    .from('match_analysis')
    .select('*')
    .order('match_date', { ascending: false })
    .order('minute', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function insertMatchAnalysis(records) {
  const { error } = await supabase
    .from('match_analysis')
    .insert(records)

  if (error) throw error
}
