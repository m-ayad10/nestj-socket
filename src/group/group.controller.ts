import {
	Body,
	Controller,
	Delete,
	Param,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/access-token.guard.js';
import { GroupService } from './group.service.js';
import { CreateGroupDto } from './dto/group.dto.js';

@Controller('group')
@UseGuards(AccessTokenGuard)
export class GroupController {
	constructor(private readonly groupService: GroupService) {}

	@Post()
	createGroup(
		@Body() body: CreateGroupDto,
		@Req() request: AuthenticatedRequest,
	) {
		return this.groupService.createGroup(body, request.user.id);
	}

	@Delete(':groupId')
	deleteGroup(@Param('groupId') groupId: string) {
		return this.groupService.deleteGroup(groupId);
	}

	@Post(':groupId/join')
	joinGroup(
		@Param('groupId') groupId: string,
		@Req() request: AuthenticatedRequest,
	) {
		return this.groupService.joinGroup(groupId, request.user.id);
	}

	@Post(':groupId/leave')
	leaveGroup(
		@Param('groupId') groupId: string,
		@Req() request: AuthenticatedRequest,
	) {
		return this.groupService.leaveGroup(groupId, request.user.id);
	}
}
