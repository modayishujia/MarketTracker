import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Note } from '../types'

interface NotesPanelProps {
  articleId: number
}

export function NotesPanel({ articleId }: NotesPanelProps) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.notes.getByArticle(articleId)
      setNotes(result)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleAdd = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    try {
      await (window as any).electronAPI.notes.add(articleId, newNote.trim())
      setNewNote('')
      await loadNotes()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    await (window as any).electronAPI.notes.delete(id)
    await loadNotes()
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-white font-semibold mb-3">Notes</h3>

      <div className="mb-3">
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          rows={3}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newNote.trim()}
          className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">{t('common.loading')}</p>
      ) : notes.length === 0 ? (
        <p className="text-gray-500 text-sm">No notes yet</p>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="bg-gray-900 rounded-md p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-red-400 hover:text-red-300 text-sm shrink-0"
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
