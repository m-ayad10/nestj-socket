import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../dto/socket.dto.js';
import { PrivateGateway } from './private.gateway.js';

describe('PrivateGateway', () => {
  let gateway: PrivateGateway;
  const roomEmit = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivateGateway],
    }).compile();

    gateway = module.get<PrivateGateway>(PrivateGateway);
    gateway.server = {
      to: vi.fn(() => ({ emit: roomEmit })),
    } as unknown as Server;
  });

  function createSocket(id: string): AuthenticatedSocket {
    const rooms = new Set<string>();
    return {
      id,
      rooms,
      join: vi.fn((room: string) => rooms.add(room)),
      to: vi.fn(),
    } as unknown as AuthenticatedSocket;
  }

  it('uses one consistent room and sends private messages only to it', async () => {
    const sender = createSocket('socket-1');
    const receiver = createSocket('socket-2');
    const thirdUser = createSocket('socket-3');

    gateway.handleRegister(sender, { userId: 'user123', username: 'Savan' });
    gateway.handleRegister(receiver, { userId: 'user456', username: 'Mina' });
    gateway.handleRegister(thirdUser, { userId: 'user789', username: 'Lee' });

    expect(
      gateway.sendPrivateMessage(sender, {
        receiverId: 'user456',
        message: 'Hey!',
      }),
    ).toEqual({
      success: false,
      message: 'Start the private chat before sending messages',
    });

    await gateway.joinPrivate(sender, { receiverId: 'user456' });

    expect(gateway.generateRoomId({
      senderId: 'user123',
      receiverId: 'user456',
    })).toBe('private:user123:user456');
    expect(gateway.generateRoomId({
      senderId: 'user456',
      receiverId: 'user123',
    })).toBe('private:user123:user456');
    expect(sender.join).toHaveBeenCalledWith('private:user123:user456');
    expect(receiver.join).toHaveBeenCalledWith('private:user123:user456');
    expect(thirdUser.rooms.has('private:user123:user456')).toBe(false);

    gateway.sendPrivateMessage(sender, {
      receiverId: 'user456',
      message: 'Hey!',
    });

    expect(gateway.server.to).toHaveBeenCalledWith('private:user123:user456');
    expect(roomEmit).toHaveBeenCalledWith('private-message', {
      senderId: 'user123',
      receiverId: 'user456',
      message: 'Hey!',
    });
  });
});
