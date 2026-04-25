/**
 * @author inspur-iep-ai
 * 交易实体 API 接口
 */
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** 交易实体信息 */
export interface TradeEntityInfo {
  id?: string;
  name?: string;
  entityCode?: string;
  entityType?: string;
  operationStatus?: string;
  deptId?: string;
  gridArea?: string;
  createTime?: string;
  updateTime?: string;
}

/** 交易实体列表项 */
export interface TradeEntityListItem {
  id: string;
  name?: string;
  entityCode?: string;
  entityType?: string;
  operationStatus?: string;
  deptId?: string;
  gridArea?: string;
  createTime?: string;
  updateTime?: string;
}

export interface AssetItem {
  assetId: number | string;
  assetType: string;
}

/** 保存部门关联资产参数 */
export interface CreateTradeEntityParams {
  assets: AssetItem[];
  deptId: number | string;
}

/** 更新交易实体参数 */
export interface UpdateTradeEntityParams {
  id: string;
  name?: string;
  entityCode?: string;
  entityType?: string;
  operationStatus?: string;
  deptId?: string;
  gridArea?: string;
}

/** 交易实体列表响应,不分页 */
export interface TradeEntityListResponse {
  data: TradeEntityListItem[];
  code: string;
  message: string;
}

/** 交易实体查询参数 */
export interface TradeEntityQueryParams {
  name?: string;
  entityCode?: string;
  entityType?: string;
  operationStatus?: string;
  deptId?: string;
  gridArea?: string;
}

// ==================== API 函数 ====================

/**
 * 获取交易实体列表
 */
export async function getTradeEntityListApi(params?: TradeEntityQueryParams) {
  return requestClient.get<TradeEntityListItem[]>(
    '/iep-res-entity-service/external/private/tradeEntity/list-all',
    { params },
  );
}

/**
 * 创建交易实体
 */
export async function createTradeEntityApi(data: CreateTradeEntityParams) {
  return requestClient.post(
    '/de-base-system/external/private/dept/asset/save',
    data,
  );
}

/**
 * 获取部门关联资产列表
 */
export async function getDeptAssetsApi(id: number | string) {
  return requestClient.get<AssetItem[]>(
    `/de-base-system/external/private/dept/${id}/asset`,
  );
}
