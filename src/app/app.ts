import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from './components/chat/chat';


@Component({
  selector: 'app-root',
  imports: [ChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('angular-chat-frontend');
}
