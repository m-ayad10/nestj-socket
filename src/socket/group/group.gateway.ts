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

import { AuthenticatedSocket } from '../dto/socket.dto.js';

import {
  JoinGroupDto,
  LeaveGroupDto,
  RegisterGroupUserDto,
  SendGroupMessageDto,
} from '../dto/group-socket.dto.js';

@WebSocketGateway({
  namespace: '/group',
})
export class GroupGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private users = new Map<string, AuthenticatedSocket>();

  private groups = new Map<string, Set<string>>();

  @WebSocketServer()
  server: Server;

  handleConnection(client: AuthenticatedSocket) {
    console.log('User connected to group namespace:', client.id);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log('User disconnected from group namespace:', client.id);

    const userId = client.userId;

    if (!userId) {
      return;
    }

    this.users.delete(userId);

    const username = client.username;

    this.groups.forEach((groupUsers, groupId) => {
      if (groupUsers.has(userId)) {
        groupUsers.delete(userId);

        this.server.to(this.getGroupRoom(groupId)).emit('user-left', {
          groupId,
          userId,
          username,
          message: `${username} left the ${groupId} group`,
        });

        if (groupUsers.size === 0) {
          this.groups.delete(groupId);
        }
      }
    });
  }

  @SubscribeMessage('register-user')
  handleUserRegister(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: RegisterGroupUserDto,
  ) {
    const { userId, username } = payload;

    if (!userId || !username) {
      return {
        success: false,
        message: 'Please provide userId and username',
      };
    }

    if (this.users.has(userId)) {
      return {
        success: false,
        message: 'User already exists',
      };
    }

    client.userId = userId;
    client.username = username;

    this.users.set(userId, client);

    return {
      success: true,
      message: 'User registered successfully',
    };
  }

  @SubscribeMessage('join-group')
  async handleJoinGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinGroupDto,
  ) {
    const userId = client.userId;

    if (!userId) {
      return {
        success: false,
        message: 'User is not registered',
      };
    }

    const { groupId } = payload;

    if (!groupId) {
      return { success: false, message: 'Group ID cannot be empty' };
    }

    const roomId = this.getGroupRoom(groupId);
    await client.join(roomId);

    let groupUsers = this.groups.get(groupId);

    if (!groupUsers) {
      groupUsers = new Set<string>();
      this.groups.set(groupId, groupUsers);
    }

    groupUsers.add(userId);

    client.to(roomId).emit('user-joined', {
      groupId,
      userId,
      username: client.username,
      message: `${client.username} joined the ${groupId} group`,
    });

    return {
      success: true,
      message: 'Joined group successfully',
      groupId,
    };
  }

  @SubscribeMessage('leave-group')
  async handleLeaveGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: LeaveGroupDto,
  ) {
    const userId = client.userId;

    if (!userId) {
      return {
        success: false,
        message: 'User is not registered',
      };
    }

    const { groupId } = payload;

    if (!groupId) {
      return { success: false, message: 'Group ID cannot be empty' };
    }

    const groupUsers = this.groups.get(groupId);

    if (!groupUsers) {
      return {
        success: false,
        message: 'Group does not exist',
      };
    }

    if (!groupUsers.has(userId)) {
      return {
        success: false,
        message: 'User is not a member of this group',
      };
    }

    groupUsers.delete(userId);

    await client.leave(this.getGroupRoom(groupId));

    this.server.to(this.getGroupRoom(groupId)).emit('user-left', {
      groupId,
      userId,
      username: client.username,
      message: `${client.username} left the ${groupId} group`,
    });

    if (groupUsers.size === 0) {
      this.groups.delete(groupId);
    }

    return {
      success: true,
      message: 'Left group successfully',
      groupId,
    };
  }

  @SubscribeMessage('send-group-message')
  handleGroupMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendGroupMessageDto,
  ) {
    const userId = client.userId;
    const username = client.username;

    if (!userId) {
      return {
        success: false,
        message: 'User is not registered',
      };
    }

    const { groupId, message } = payload;

    if (!groupId) {
      return { success: false, message: 'Group ID cannot be empty' };
    }

    if (!message) {
      return {
        success: false,
        message: 'Message cannot be empty',
      };
    }

    const groupUsers = this.groups.get(groupId);

    if (!groupUsers) {
      return {
        success: false,
        message: 'Group does not exist',
      };
    }

    if (!groupUsers.has(userId)) {
      return {
        success: false,
        message: 'User is not a member of this group',
      };
    }

    client.to(this.getGroupRoom(groupId)).emit('group-message', {
      groupId,
      senderId: userId,
      senderName: username,
      message,
    });

    return {
      success: true,
      message: 'Message sent successfully',
    };
  }

  private getGroupRoom(groupId: string) {
    return `group:${groupId}`;
  }
}