export class JoinGroupDto {
  groupId: string;
}

export class RegisterGroupUserDto {
  userId: string;
  username: string;
}

export class LeaveGroupDto {
  groupId: string;
}

export class SendGroupMessageDto {
  groupId: string;
  message: string;
}