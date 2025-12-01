import { chatApi } from './api'

export interface Message {
  id: string
  chatId: string
  senderId: string
  text: string
  attachments?: string[]
  createdAt: string
}

class ChatService {
  private static instance: ChatService
  
  private constructor() {}
  
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  async getMessages(chatId: string): Promise<Message[]> {
    const response = await chatApi.getMessages(chatId)
    return response.data
  }

  async sendMessage(chatId: string, text: string, attachments?: string[]): Promise<Message> {
    // attachments should be array of attachment ids/urls (string) as expected by chatApi
    const response = await chatApi.sendMessage(chatId, { text, attachments })
    return response.data
  }

  // WebSocket connection handling could be added here
  // Example:
  /*
  private ws: WebSocket | null = null

  connectWebSocket(chatId: string) {
    this.ws = new WebSocket(`${process.env.VITE_WS_URL}/chat/${chatId}`)
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      // Handle incoming message
    }
    
    this.ws.onclose = () => {
      // Handle connection close
      setTimeout(() => this.connectWebSocket(chatId), 1000)
    }
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  */
}

export const chatService = ChatService.getInstance()
export default chatService