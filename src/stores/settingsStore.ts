import { create } from 'zustand'
import type { LLMConfig } from '../types'

interface SettingsStore {
  llmConfig: LLMConfig
  fetchInterval: number
  autoAnalyze: boolean
  language: string
  loading: boolean
  loadSettings: () => Promise<void>
  saveLLMConfig: (config: LLMConfig) => Promise<void>
  saveFetchInterval: (interval: number) => Promise<void>
  saveAutoAnalyze: (auto: boolean) => Promise<void>
  saveLanguage: (lang: string) => Promise<void>
  testConnection: () => Promise<{ ok: boolean; error?: string }>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  llmConfig: { baseUrl: '', apiKey: '', model: '' },
  fetchInterval: 30,
  autoAnalyze: false,
  language: 'zh',
  loading: false,
  loadSettings: async () => {
    set({ loading: true })
    try {
      const api = (window as any).electronAPI.settings
      const [baseUrl, apiKey, model, interval, auto, lang] = await Promise.all([
        api.get('llm_baseUrl'),
        api.get('llm_apiKey'),
        api.get('llm_model'),
        api.get('fetchInterval'),
        api.get('autoAnalyze'),
        api.get('language')
      ])
      set({
        llmConfig: { baseUrl: baseUrl || '', apiKey: apiKey || '', model: model || '' },
        fetchInterval: parseInt(interval) || 30,
        autoAnalyze: auto === 'true',
        language: lang || 'zh',
        loading: false
      })
    } catch (error) {
      set({ loading: false })
    }
  },
  saveLLMConfig: async (config) => {
    const api = (window as any).electronAPI.settings
    await api.set('llm_baseUrl', config.baseUrl)
    await api.set('llm_apiKey', config.apiKey)
    await api.set('llm_model', config.model)
    set({ llmConfig: config })
  },
  saveFetchInterval: async (interval) => {
    await (window as any).electronAPI.settings.set('fetchInterval', interval.toString())
    set({ fetchInterval: interval })
  },
  saveAutoAnalyze: async (auto) => {
    await (window as any).electronAPI.settings.set('autoAnalyze', auto.toString())
    set({ autoAnalyze: auto })
  },
  saveLanguage: async (lang) => {
    await (window as any).electronAPI.settings.set('language', lang)
    set({ language: lang })
  },
  testConnection: async () => {
    try {
      return await (window as any).electronAPI.llm.testConnection()
    } catch (err: any) {
      return { ok: false, error: err.message || 'Unknown error' }
    }
  }
}))
