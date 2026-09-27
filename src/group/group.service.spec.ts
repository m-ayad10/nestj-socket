import { Test, TestingModule } from '@nestjs/testing';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { GroupService } from './group.service.js';

describe('GroupService', () => {
  let service: GroupService;
  const groupsFile = resolve(process.cwd(), 'assets', 'groups.json');

  beforeEach(async () => {
    await writeFile(groupsFile, '[]\n', 'utf8');
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupService],
    }).compile();

    service = module.get<GroupService>(GroupService);
  });

  afterEach(async () => {
    await writeFile(groupsFile, '[]\n', 'utf8');
  });

  it('creates a group with an empty users list and persists it', async () => {
    const group = await service.createGroup({ groupId: 'developers' }, 1);

    expect(group).toEqual({ groupId: 'developers', users: [1] });
    expect(JSON.parse(await readFile(groupsFile, 'utf8'))).toEqual([
      { groupId: 'developers', users: [1] },
    ]);
  });

  it('adds and removes user IDs from a persisted group', async () => {
    await service.createGroup({ groupId: 'developers' }, 1);

    const joined = await service.joinGroup('developers', 2);
    expect(joined.users).toEqual([1, 2]);

    const left = await service.leaveGroup('developers', 1);
    expect(left.users).toEqual([2]);
    expect(JSON.parse(await readFile(groupsFile, 'utf8'))).toEqual([
      { groupId: 'developers', users: [2] },
    ]);
  });

  it('deletes a group and rejects duplicate membership', async () => {
    await service.createGroup({ groupId: 'developers' }, 1);

    await expect(
      service.joinGroup('developers', 1),
    ).rejects.toMatchObject({ status: 409 });

    await expect(service.deleteGroup('missing')).rejects.toMatchObject({
      status: 404,
    });
    await service.deleteGroup('developers');
    expect(JSON.parse(await readFile(groupsFile, 'utf8'))).toEqual([]);
  });
});
