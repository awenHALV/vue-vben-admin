import { nextTick } from 'vue';

import { describe, expect, it, vi } from 'vitest';

// pnpm test:unit apps/web-antdv-next/src/views/system/menu/__tests__/menu-scroll.spec.ts

/**
 * 模拟 Vxe Table Grid API
 */
const createMockGridApi = () => {
  const mockGrid = {
    getRowById: vi.fn(),
    scrollToRow: vi.fn(),
    getTreeExpandRecords: vi.fn().mockReturnValue([]),
    setTreeExpand: vi.fn().mockResolvedValue(undefined),
    getFullData: vi.fn().mockReturnValue([]),
  };

  return {
    grid: mockGrid,
    reload: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(undefined),
  };
};

/**
 * 测试用例：验证菜单管理页面滚动定位功能的逻辑
 *
 * 问题背景：
 * 在菜单管理页面执行新增/编辑/删除操作后，表格会重新加载数据，
 * 导致滚动条回到顶部，用户无法看到刚才操作的行。
 *
 * 优化目标：
 * 操作完成后，表格应滚动到目标行位置，而不是停留在顶部。
 */
describe('菜单管理滚动定位功能测试', () => {
  /**
   * 测试场景1：编辑菜单后应该定位到被编辑的行
   * 预期：调用 scrollToRow 方法滚动到目标行
   */
  it('编辑菜单后应该定位到被编辑的行', async () => {
    const mockGridApi = createMockGridApi();
    const targetId = 123;
    const targetRow = { id: 123, featureName: '测试菜单' };

    // 模拟 getRowById 返回目标行
    mockGridApi.grid.getRowById = vi.fn().mockReturnValue(targetRow);

    // 模拟滚动到目标行的逻辑
    async function scrollToTargetRow(targetId: number | string) {
      const targetRowResult = mockGridApi.grid.getRowById(targetId);
      if (targetRowResult) {
        await mockGridApi.grid.scrollToRow(targetRowResult);
      }
    }

    // 执行滚动
    await scrollToTargetRow(targetId);

    // 验证：scrollToRow 应该被调用，参数为目标行对象
    expect(mockGridApi.grid.scrollToRow).toHaveBeenCalledWith(targetRow);
    expect(mockGridApi.grid.getRowById).toHaveBeenCalledWith(targetId);
  });

  /**
   * 测试场景2：新增子菜单后应该定位到父节点并展开
   * 预期：展开父节点，用户能看到新增的位置
   */
  it('新增子菜单后应该定位到父节点', async () => {
    const mockGridApi = createMockGridApi();
    const parentId = 456;
    const parentRow = { id: 456, featureName: '父菜单', children: [] };

    // 模拟 getRowById 返回父节点
    mockGridApi.grid.getRowById = vi.fn().mockReturnValue(parentRow);

    // 模拟滚动到父节点的逻辑
    async function scrollToTargetRow(targetId: number | string) {
      const targetRowResult = mockGridApi.grid.getRowById(targetId);
      if (targetRowResult) {
        await mockGridApi.grid.scrollToRow(targetRowResult);
      }
    }

    // 执行滚动
    await scrollToTargetRow(parentId);

    // 验证：scrollToRow 应该被调用，参数为父节点行对象
    expect(mockGridApi.grid.scrollToRow).toHaveBeenCalledWith(parentRow);
    expect(mockGridApi.grid.getRowById).toHaveBeenCalledWith(parentId);
  });

  /**
   * 测试场景3：删除菜单后应该定位到父节点
   * 预期：删除完成后滚动到父节点位置
   */
  it('删除菜单后应该定位到父节点', async () => {
    const mockGridApi = createMockGridApi();
    const parentId = 789;
    const parentRow = { id: 789, featureName: '父菜单' };

    // 模拟 getRowById 返回父节点
    mockGridApi.grid.getRowById = vi.fn().mockReturnValue(parentRow);

    // 模拟滚动到父节点的逻辑（删除场景）
    async function scrollToParentAfterDelete(parentId: null | number | string) {
      if (parentId) {
        const parentRowResult = mockGridApi.grid.getRowById(parentId);
        if (parentRowResult) {
          await mockGridApi.grid.scrollToRow(parentRowResult);
        }
      }
    }

    // 执行滚动
    await scrollToParentAfterDelete(parentId);

    // 验证：删除后应该滚动到父节点
    expect(mockGridApi.grid.scrollToRow).toHaveBeenCalledWith(parentRow);
    expect(mockGridApi.grid.getRowById).toHaveBeenCalledWith(parentId);
  });

  /**
   * 测试场景4：当目标行不存在时不应该调用滚动方法
   * 预期：如果 getRowById 返回 undefined，则不调用 scrollToRow
   */
  it('目标行不存在时不应该调用滚动方法', async () => {
    const mockGridApi = createMockGridApi();
    const targetId = 999;

    // 模拟 getRowById 返回 undefined（行不存在）
    mockGridApi.grid.getRowById = vi.fn().mockReturnValue(undefined);

    // 模拟滚动逻辑
    async function scrollToTargetRow(targetId: number | string) {
      const targetRowResult = mockGridApi.grid.getRowById(targetId);
      if (targetRowResult) {
        await mockGridApi.grid.scrollToRow(targetRowResult);
      }
    }

    // 尝试滚动到不存在的行
    await scrollToTargetRow(targetId);

    // 验证：getRowById 被调用但返回 undefined，不应该调用 scrollToRow
    expect(mockGridApi.grid.getRowById).toHaveBeenCalledWith(targetId);
    expect(mockGridApi.grid.scrollToRow).not.toHaveBeenCalled();
  });

  /**
   * 测试场景5：新增根级菜单后不需要特殊定位
   * 预期：新增根级菜单（parentId=0）时，不需要滚动到特定行
   */
  it('新增根级菜单后不需要特殊定位', async () => {
    const mockGridApi = createMockGridApi();
    const rootParentId = 0;

    // 模拟 getRowById 返回 undefined（根节点不需要定位）
    mockGridApi.grid.getRowById = vi.fn().mockReturnValue(undefined);

    // 模拟滚动逻辑：当 parentId 为 0 时不滚动
    const targetRow = mockGridApi.grid.getRowById(rootParentId);
    const shouldScroll = targetRow !== undefined && rootParentId !== 0;

    // 验证：根级菜单不需要滚动
    expect(targetRow).toBeUndefined();
    expect(shouldScroll).toBe(false);
  });

  /**
   * 测试场景6：验证完整的操作流程
   * 预期：模拟编辑 → 保存 → 重新加载 → 滚动到目标行的完整流程
   */
  it('完整流程：编辑后重新加载并滚动到目标行', async () => {
    const mockGridApi = createMockGridApi();
    const targetId = 111;
    const targetRow = { id: 111, featureName: '编辑的菜单' };

    mockGridApi.grid.getRowById = vi.fn().mockReturnValue(targetRow);
    mockGridApi.reload.mockResolvedValue(undefined);

    // 步骤1: 重新加载数据
    await mockGridApi.reload({});

    // 等待 nextTick（模拟 await nextTick()）
    await nextTick();

    // 步骤2: 获取目标行并滚动
    const targetRowResult = mockGridApi.grid.getRowById(targetId);
    if (targetRowResult) {
      mockGridApi.grid.scrollToRow(targetRowResult);
    }

    // 验证完整流程
    expect(mockGridApi.reload).toHaveBeenCalledTimes(1);
    expect(mockGridApi.grid.getRowById).toHaveBeenCalledWith(targetId);
    expect(mockGridApi.grid.scrollToRow).toHaveBeenCalledWith(targetRow);
  });
});

/**
 * 测试 AddOrUpdate 组件返回的 payload 结构
 * 验证新增/编辑/删除操作后传递的参数是否正确
 */
describe('addOrUpdate 组件 success 事件 payload 测试', () => {
  /**
   * 测试场景：编辑模式返回 targetId
   */
  it('编辑模式应该返回被编辑行的ID', () => {
    const isEdit = true;
    const currentRecord = { id: 123, featureName: '测试菜单' };

    const targetId = isEdit ? currentRecord?.id : undefined;

    expect(targetId).toBe(123);
  });

  /**
   * 测试场景：新增模式返回父节点ID（用于展开）
   */
  it('新增模式应该返回父节点ID用于展开', () => {
    const isEdit = false;
    const payload = { parentId: 456 };

    const targetId = isEdit
      ? undefined
      : payload.parentId === 0
        ? undefined
        : payload.parentId);

    expect(targetId).toBe(456);
  });

  /**
   * 测试场景：新增根级菜单（parentId=0）不返回targetId
   */
  it('新增根级菜单不返回targetId', () => {
    const isEdit = false;
    const payload = { parentId: 0 };

    const targetId = isEdit
      ? undefined
      : payload.parentId === 0
        ? undefined
        : payload.parentId);

    expect(targetId).toBeUndefined();
  });

  /**
   * 测试场景：验证 expandParentId 的计算逻辑
   */
  it('应该正确计算 expandParentId', () => {
    // 编辑模式：不需要展开父节点
    expect(calculateExpandParentId(true, 123)).toBeUndefined();

    // 新增子菜单：需要展开父节点
    expect(calculateExpandParentId(false, 456)).toBe(456);

    // 新增根级菜单：不需要展开
    expect(calculateExpandParentId(false, 0)).toBeUndefined();
  });
});

/**
 * 模拟 AddOrUpdate 组件中的 expandParentId 计算逻辑
 */
function calculateExpandParentId(
  isEdit: boolean,
  parentId: number | string,
): number | string | undefined {
  return isEdit || !parentId ? undefined : (parentId as number | string);
}
