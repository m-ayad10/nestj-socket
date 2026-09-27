import {
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	CreateGroupDto,
	GroupDto,
} from './dto/group.dto.js';

@Injectable()
export class GroupService {
	private readonly groupsFile = resolve(process.cwd(), 'assets', 'groups.json');

	async createGroup(body: CreateGroupDto, userId: number): Promise<GroupDto> {
		const groups = await this.readGroups();
		const groupId = body.groupId.trim();

		if (groups.some((group) => group.groupId === groupId)) {
			throw new ConflictException('Group already exists');
		}

		const group = new GroupDto();
		group.groupId = groupId;
		group.users = [userId];
		groups.push(group);
		await this.writeGroups(groups);
		return group;
	}

	async deleteGroup(groupId: string): Promise<{ message: string }> {
		const groups = await this.readGroups();
		const groupIndex = groups.findIndex((group) => group.groupId === groupId);

		if (groupIndex === -1) {
			throw new NotFoundException('Group not found');
		}

		groups.splice(groupIndex, 1);
		await this.writeGroups(groups);
		return { message: 'Group deleted successfully' };
	}

	async joinGroup(
		groupId: string,
		userId: number,
	): Promise<GroupDto> {
		const groups = await this.readGroups();
		const group = this.findGroup(groups, groupId);

		if (group.users.includes(userId)) {
			throw new ConflictException('User is already a member of this group');
		}

		group.users.push(userId);
		await this.writeGroups(groups);
		return group;
	}

	async leaveGroup(
		groupId: string,
		userId: number,
	): Promise<GroupDto> {
		const groups = await this.readGroups();
		const group = this.findGroup(groups, groupId);
		const userIndex = group.users.indexOf(userId);

		if (userIndex === -1) {
			throw new NotFoundException('User is not a member of this group');
		}

		group.users.splice(userIndex, 1);
		await this.writeGroups(groups);
		return group;
	}

	private findGroup(groups: GroupDto[], groupId: string): GroupDto {
		const group = groups.find((storedGroup) => storedGroup.groupId === groupId);
		if (!group) {
			throw new NotFoundException('Group not found');
		}
		return group;
	}

	private async readGroups(): Promise<GroupDto[]> {
		const contents = await readFile(this.groupsFile, 'utf8');
		const groups = JSON.parse(contents || '[]') as GroupDto[];
		return groups.map((group) => Object.assign(new GroupDto(), group));
	}

	private async writeGroups(groups: GroupDto[]): Promise<void> {
		await writeFile(this.groupsFile, `${JSON.stringify(groups, null, 2)}\n`, 'utf8');
	}
}
