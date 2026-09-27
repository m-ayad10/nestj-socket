import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'http';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class SocketGateway 
implements OnGatewayConnection,OnGatewayDisconnect {

  // @WebSocketServer()
  // server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected', client.id)
    client.emit('connected', 'Connected successfully');
  }

  handleDisconnect(client: Socket) {
    console.log("Client Disconnected", client.id)
  }

  @SubscribeMessage('message')
  handleMessage(client:Socket, message:string){
    
    console.log(message)
    client.emit('respond-message', {
    text: 'Hello client',
  });
  }
}
