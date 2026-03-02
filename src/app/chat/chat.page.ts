import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false,
})
export class ChatPage implements OnInit {
  messages: Array<{id: string; text: string; fromMe: boolean; time: string}> = [];
  newMessage: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    // sample placeholder messages
    this.messages = [
      { id: '1', text: 'Welcome to the chat!', fromMe: false, time: '10:00 AM' },
      { id: '2', text: 'Hi — say hello 👋', fromMe: true, time: '10:01 AM' }
    ];
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (!text) return;

    this.messages.push({
      id: Date.now().toString(),
      text,
      fromMe: true,
      time: new Date().toLocaleTimeString()
    });

    this.newMessage = '';

    // placeholder: scroll or persist would go here
  }

  openConversation(userId: string) {
    // navigate to conversation thread if you have one
    this.router.navigate(['/messages', userId]);
  }
}
