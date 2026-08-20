import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const CategoriesContext = createContext(null)

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([])

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <CategoriesContext.Provider value={{ categories, refresh }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider')
  return ctx
}
