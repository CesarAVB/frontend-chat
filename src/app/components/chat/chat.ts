import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService, ChatMessage } from '../../services/websocket';
import { Subscription } from 'rxjs';

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  username: string = '';
  roomName: string = 'geral';
  messageInput: string = '';
  isConnected: boolean = false;
  messages: Message[] = [];
  
  private messageSubscription?: Subscription;
  private connectionSubscription?: Subscription;

  constructor(private webSocketService: WebSocketService) {
    console.log('ChatComponent constructor');
  }

  ngOnInit(): void {
    // Inscreve-se para receber mensagens do WebSocket
    this.messageSubscription = this.webSocketService.getMessages()
      .subscribe(message => {
        if (message) {
          console.log('Mensagem recebida:', message);
          console.log('Meu username:', this.username);
          console.log('Username da mensagem (from):', message.from);
          
          this.messages.push({
            id: Date.now().toString(),
            username: message.from,
            content: message.content,
            timestamp: new Date(message.timestamp)
          });
        }
      });

    // Inscreve-se para receber status de conexão
    this.connectionSubscription = this.webSocketService.getConnectionStatus()
      .subscribe(status => {
        this.isConnected = status;
      });
  }

  ngOnDestroy(): void {
    // Cancela as inscrições ao destruir o componente
    this.messageSubscription?.unsubscribe();
    this.connectionSubscription?.unsubscribe();
    this.disconnect();
  }

  connect(): void {
    if (this.username.trim()) {
      this.webSocketService.connect(this.username, this.roomName);
    }
  }

  disconnect(): void {
    this.webSocketService.disconnect();
    this.messages = [];
  }

  sendMessage(): void {
    if (this.messageInput.trim() && this.isConnected) {
      this.webSocketService.sendMessage(this.username, this.messageInput, this.roomName);
      this.messageInput = '';
    }
  }
}