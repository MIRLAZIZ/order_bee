// notifications.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';



@WebSocketGateway({ 
    namespace: '/notifications',   
    cors: true })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;



  sendNotification(userId: number, message: string) {
    console.log(message, 'bu sent notfiy');
    
    // this.server.to(userId.toString()).emit('new-sale', message);
    this.server.emit('new-sale', message);
  }
}
