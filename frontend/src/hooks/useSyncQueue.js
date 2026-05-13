import { useEffect, useRef } from 'react'
import api from '../api/axios'
import {
  getQueuedMutations,
  removeQueuedMutation,
} from '../db/localDB'
import toast from 'react-hot-toast'

export default function useSyncQueue(online) {
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!online || syncingRef.current) return
    syncAll()
  }, [online])

  const syncAll = async () => {
    syncingRef.current = true
    const queue = await getQueuedMutations()
    if (!queue.length) { syncingRef.current = false; return }

    let synced = 0
    for (const item of queue) {
      try {
        const method = item.method.toLowerCase()
        if (method === 'post')   await api.post(item.url, item.data)
        if (method === 'put')    await api.put(item.url, item.data)
        if (method === 'patch')  await api.patch(item.url, item.data)
        if (method === 'delete') await api.delete(item.url)
        await removeQueuedMutation(item.id)
        synced++
      } catch (err) {
        // Leave in queue if server error; remove if 4xx (invalid)
        if (err.response?.status < 500) await removeQueuedMutation(item.id)
      }
    }

    if (synced > 0) toast.success(`Synced ${synced} offline change${synced > 1 ? 's' : ''}`)
    syncingRef.current = false
  }

  return { syncAll }
}