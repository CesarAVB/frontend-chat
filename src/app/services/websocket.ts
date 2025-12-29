import { Injectable } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  from: string;
  content: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: Client | null = null;
  private subscription: StompSubscription | null = null;
  private messageSubject = new BehaviorSubject<ChatMessage | null>(null);
  private connectedSubject = new BehaviorSubject<boolean>(false);

  constructor() {}

  connect(username: string, roomName: string): void {
    // Cria o socket SockJS apontando para o endpoint /ws do backend
    const socket = new SockJS(`${environment.apiUrl}/ws`);
    
    // Configura o cliente STOMP
    this.stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        console.log('STOMP Debug:', str);
      }
    });

    // Callback de conexão bem-sucedida
    this.stompClient.onConnect = (frame) => {
      console.log('✅ Conectado e inscrito em /topic/chat/' + roomName);
      this.connectedSubject.next(true);

      // Inscreve-se no tópico da sala específica
      if (this.stompClient) {
        this.subscription = this.stompClient.subscribe(
          `/topic/chat/${roomName}`,
          (message) => {
            const chatMessage: ChatMessage = JSON.parse(message.body);
            console.log('Mensagem recebida:', chatMessage);
            this.messageSubject.next(chatMessage);
          }
        );
      }

      // Envia mensagem que o usuário entrou (opcional)
      this.sendUserJoined(username, roomName);
    };

    // Callback de erro
    this.stompClient.onStompError = (frame) => {
      console.error('❌ Erro:', frame);
      this.connectedSubject.next(false);
    };

    // Ativa a conexão
    this.stompClient.activate();
  }

  disconnect(): void {
    // Cancela a inscrição
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    // Desativa o cliente
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }

    this.connectedSubject.next(false);
    console.log('Desconectado');
  }

  sendMessage(from: string, content: string, roomName: string): void {
    if (this.stompClient && this.stompClient.connected) {
      const message: ChatMessage = {
        from,
        content,
        timestamp: new Date()
      };
      
      // Envia para /app/chat.send/{room} que mapeia para o @MessageMapping
      this.stompClient.publish({
        destination: `/app/chat.send/${roomName}`,
        body: JSON.stringify(message)
      });
    } else {
      console.error('Cliente não está conectado');
    }
  }

  private sendUserJoined(username: string, roomName: string): void {
    const message: ChatMessage = {
      from: username,
      content: `${username} entrou na sala`,
      timestamp: new Date()
    };

    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: `/app/chat.send/${roomName}`,
        body: JSON.stringify(message)
      });
    }
  }

  getMessages(): Observable<ChatMessage | null> {
    return this.messageSubject.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectedSubject.asObservable();
  }

  isConnected(): boolean {
    return this.stompClient?.connected || false;
  }
}