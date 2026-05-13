import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

export default function useCollabEditor({ noteId, userId, token, enabled, onContentChange }) {
  const ydocRef     = useRef(null)
  const providerRef = useRef(null)
  const textareaRef = useRef(null)
  const observerRef = useRef(null)

  const [status, setStatus]   = useState('connecting')
  const [users,  setUsers]    = useState([])

  useEffect(() => {
    if (!enabled || !noteId) return

    const ydoc    = new Y.Doc()
    ydocRef.current = ydoc

    const wsUrl = `ws://localhost:1234`  // Hocuspocus port

    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: `note-${noteId}`,
      document: ydoc,
      parameters: { userId, token },

      onStatus: ({ status }) => setStatus(status),

      onAwarenessUpdate: ({ states }) => {
        const others = [...states.entries()]
          .filter(([client]) => client !== provider.awareness.clientID)
          .map(([, state]) => state.user)
          .filter(Boolean)
        setUsers(others)
      },
    })

    // Set local user in awareness
    provider.setAwarenessField('user', {
      id: userId,
      color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6,'0'),
    })

    providerRef.current = provider

    return () => {
      if (observerRef.current) {
        const ytext = ydoc.getText('content')
        ytext.unobserve(observerRef.current)
      }
      provider.destroy()
      ydoc.destroy()
    }
  }, [noteId, enabled])

  // Bind Y.js text to textarea DOM element (manual)
  const bindTextarea = (el) => {
    if (!el || !ydocRef.current || !enabled) return
    if (textareaRef.current === el) return
    textareaRef.current = el

    const ytext = ydocRef.current.getText('content')

    // Remove old observer
    if (observerRef.current) {
      ytext.unobserve(observerRef.current)
    }

    // Set initial value from Yjs
    if (ytext.toString()) {
      el.value = ytext.toString()
    }

    // Observe Yjs changes -> update textarea
    observerRef.current = () => {
      if (textareaRef.current && textareaRef.current.value !== ytext.toString()) {
        textareaRef.current.value = ytext.toString()
        if (onContentChange) onContentChange(ytext.toString())
      }
    }
    ytext.observe(observerRef.current)

    // Observe textarea changes -> update Yjs
    const handleInput = (e) => {
      const newValue = e.target.value
      if (ytext.toString() !== newValue) {
        ydocRef.current.transact(() => {
          ytext.delete(0, ytext.length)
          ytext.insert(0, newValue)
        })
        if (onContentChange) onContentChange(newValue)
      }
    }
    el.addEventListener('input', handleInput)

    // Cleanup
    return () => {
      el.removeEventListener('input', handleInput)
    }
  }

  return { bindTextarea, status, users, providerRef }
}