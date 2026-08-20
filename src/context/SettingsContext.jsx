import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', true).single()
    setSettings(data)
    setError(error)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
