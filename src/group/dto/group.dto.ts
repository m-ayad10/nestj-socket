import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateGroupDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(4)
    groupId!: string;
}

export class GroupDto {
    groupId!: string;
    users!: number[];
}