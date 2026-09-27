import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';

import {
  AuthenticatedSocket,
  GenerateRoomIdDto,
  PrivateChatDto,
  PrivateMessageDto,
  RegisterUserDto,
} from '../dto/socket.dto.js';

@WebSocketGateway({
  namespace: '/private',
})
export class PrivateGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private users = new Map<string, AuthenticatedSocket>();


  handleConnection(client: AuthenticatedSocket) {
    console.log(
      'User connected to private:',
      client.id,
    );
  }



  handleDisconnect(client: AuthenticatedSocket) {
    console.log(
      'User disconnected:',
      client.id,
    );

    if (client.userId) {
      this.users.delete(client.userId);

      console.log(
        'Removed user:',
        client.userId,
      );
    }
  }


  @SubscribeMessage('register-user')
  handleRegister(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: RegisterUserDto,
  ) {
    const { userId, username } = payload;

    if (!userId || !username) {
      return {
        success: false,
        message: 'Register with username and userId',
      };
    }

    const existingUser = this.users.get(userId);
    if (existingUser && existingUser.id !== client.id) {
      return {
        success: false,
        message: 'User is already connected',
      };
    }

    client.userId = userId;
    client.username = username;

    this.users.set(userId, client);

    console.log('User registered in private namespace:', userId, username);

    return {
      success: true,
      message: 'User registered',
    };
  }



  @SubscribeMessage('start-private-chat')
  async joinPrivate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: PrivateChatDto,
  ) {
    const senderId = client.userId;

    if (!senderId) {
      return {
        success: false,
        message: 'Please register first',
      };
    }

    const { receiverId } = payload;

    if (!receiverId) {
      return {
        success: false,
        message: 'Please send receiver Id',
      };
    }

    const receiver = this.users.get(receiverId);

    if (!receiver) {
      return {
        success: false,
        message: 'Receiver is offline',
      };
    }

    const roomId = this.generateRoomId({
      receiverId,
      senderId,
    });

    await Promise.all([client.join(roomId), receiver.join(roomId)]);

    console.log(
      `Private room created/joined: ${roomId}`,
    );

    return {
      success: true,
      roomId,
    };
  }



  @SubscribeMessage('send-private-message')
  sendPrivateMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: PrivateMessageDto,
  ) {
    const { message, receiverId } = payload;

    const senderId = client.userId;

    if (!senderId) {
      return {
        success: false,
        message: 'Please register first',
      };
    }

    if (!receiverId) {
      return {
        success: false,
        message: 'Please provide receiver Id',
      };
    }

    if (!message) {
      return {
        success: false,
        message: 'Message is empty',
      };
    }

    const receiver = this.users.get(receiverId);

    if (!receiver) {
      return {
        success: false,
        message: 'Receiver is offline',
      };
    }

    const roomId = this.generateRoomId({
      senderId,
      receiverId,
    });

    if (!client.rooms.has(roomId) || !receiver.rooms.has(roomId)) {
      return {
        success: false,
        message: 'Start the private chat before sending messages',
      };
    }

    this.server.to(roomId).emit('private-message', {
      senderId,
      receiverId,
      message,
    });

    return {
      success: true,
      message: 'Message sent',
    };
  }



  generateRoomId(payload: GenerateRoomIdDto) {
    const users = [
      payload.receiverId,
      payload.senderId,
    ].sort();

    return `private:${users[0]}:${users[1]}`;
  }
}