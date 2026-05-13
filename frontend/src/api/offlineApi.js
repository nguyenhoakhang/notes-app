import api from './axios'
import {
  localGetNotes, localSaveNote, localSaveNotes,
  localDeleteNote, localGetLabels, localSaveLabels,
  queueMutation,
} from '../db/localDB'

// GET notes — network first, fall back to local
export async function fetchNotes(params = {}) {
  try {
    const { data } = await api.get('/notes', { params })
    await localSaveNotes(data)
    return data
  } catch {
    const local = await localGetNotes()
    // Apply search filter offline
    if (params.search) {
      const q = params.search.toLowerCase()
      return local.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
      )
    }
    if (params.label_id) {
      return local.filter(n => n.labels?.some(l => l.id === params.label_id))
    }
    return local.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }
}

// GET labels — network first, fall back to local
export async function fetchLabels() {
  try {
    const { data } = await api.get('/labels')
    await localSaveLabels(data)
    return data
  } catch {
    return localGetLabels()
  }
}

// POST note — try live, queue if offline
export async function createNote(data) {
  try {
    const res = await api.post('/notes', data)
    await localSaveNote(res.data)
    return res.data
  } catch {
    // Create temp local note
    const tempNote = {
      ...data,
      id: `temp_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      labels: [],
      attachments: [],
      shares: [],
      _synced: false,
    }
    await localSaveNote(tempNote)
    await queueMutation({ method: 'POST', url: '/notes', data })
    return tempNote
  }
}

// PUT note — try live, queue if offline
export async function updateNote(id, data) {
  // Skip temp notes (not yet on server)
  if (String(id).startsWith('temp_')) {
    await queueMutation({ method: 'POST', url: '/notes', data })
    return data
  }
  try {
    const res = await api.put(`/notes/${id}`, data)
    await localSaveNote(res.data)
    return res.data
  } catch {
    await localSaveNote({ id, ...data, _synced: false })
    await queueMutation({ method: 'PUT', url: `/notes/${id}`, data })
    return { id, ...data }
  }
}

// DELETE note — try live, queue if offline
export async function deleteNote(id) {
  await localDeleteNote(id)
  if (String(id).startsWith('temp_')) return
  try {
    await api.delete(`/notes/${id}`)
  } catch {
    await queueMutation({ method: 'DELETE', url: `/notes/${id}` })
  }
}

// PIN note
export async function pinNote(id) {
  try {
    const { data } = await api.post(`/notes/${id}/pin`)
    await localSaveNote(data)
    return data
  } catch {
    await queueMutation({ method: 'POST', url: `/notes/${id}/pin`, data: {} })
    return null
  }
}