import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { GroupController } from './group.controller.js';
import { GroupService } from './group.service.js';

describe('GroupController', () => {
  let controller: GroupController;
  const groupService = {
    createGroup: vi.fn(),
    deleteGroup: vi.fn(),
    joinGroup: vi.fn(),
    leaveGroup: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [GroupController],
      providers: [
        {
          provide: GroupService,
          useValue: groupService,
        },
      ],
    }).compile();

    controller = module.get<GroupController>(GroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses the authenticated request user for membership changes', async () => {
    groupService.joinGroup.mockResolvedValue({
      groupId: 'developers',
      users: [7],
    });

    await controller.joinGroup('developers', {
      user: { id: 7, username: 'savan' },
    } as never);

    expect(groupService.joinGroup).toHaveBeenCalledWith('developers', 7);
  });
});
