import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 1234,

  // Allow all connections (auth handled by Laravel — note access already checked)
  async onConnect({ documentName, requestParameters }) {
    const noteId    = documentName.replace('note-', '')
    const userId    = requestParameters.get('userId')
    const token     = requestParameters.get('token')

    // Optional: validate token against Laravel /api/me
    // For now trust that frontend only opens WS for authorized notes
    console.log(`[connect] note=${noteId} user=${userId}`)
  },

  async onChange({ documentName }) {
    console.log(`[change] ${documentName}`)
  },
})

server.listen()
console.log('Hocuspocus running on ws://0.0.0.0:1234')