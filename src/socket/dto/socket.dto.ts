import { Socket } from "socket.io"

export class RegisterUserDto {
    userId: string;
    username: string;
}

export class AuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
}

export class PrivateChatDto {
    receiverId: string;
}

export class GenerateRoomIdDto extends PrivateChatDto {
    senderId: string;
}

export class PrivateMessageDto extends PrivateChatDto {
    message: string;
}
