/**
 * 工作台 API
 */
import type { BackendMenuItem } from '#/api/core/menu';

import { baseRequestClient, requestClient } from '#/api/request';

const basePath = '/de-base-system/external/private/workbench/message';

export interface WorkbenchWeatherLocation {
  city?: string;
  latitude?: string;
  longitude?: string;
  province?: string;
}

/**
 * 当前天气响应
 */
export interface CurrentWeatherResponse {
  /** 温度 */
  temperature: string;
  /** 相对湿度 */
  relativeHumidity: string;
  /** 风速 */
  windSpeed: string;
  /** 天气代码 */
  weatherCode: string;
  /** 查询时间 */
  queryTime: string;
  /** 纬度 */
  latitude: string;
  /** 经度 */
  longitude: string;
}

export interface RevenueSchemeShareMessageApiItem {
  createTime?: string;
  id: number | string;
  projectId?: number | string;
  projectName?: string;
  schemaId?: number | string;
  schemaName?: string;
  sharerId?: number | string;
}

export interface WorkbenchMessageItem {
  id: string;
  link?: string;
  time: string;
  title: string;
  type: 'system';
}

export interface WorkbenchAppConfigApiItem {
  appIcon?: string;
  appName?: string;
  id: number | string;
}

export interface WorkbenchAppFeatureItem extends BackendMenuItem {
  children?: null | WorkbenchAppFeatureItem[];
}

export interface WorkbenchAppConfigDetailApiItem extends WorkbenchAppConfigApiItem {
  featureIds?: string;
  features?: WorkbenchAppFeatureItem[];
}

export interface CreateWorkbenchAppConfigParams {
  appIcon?: string;
  appName: string;
  featureIds: string;
}

export async function getPublicIp() {
  return baseRequestClient.get<{ origin: string }>('https://httpbin.org/ip');
}

function normalizeRevenueSchemeShareMessage(
  item: RevenueSchemeShareMessageApiItem,
): WorkbenchMessageItem {
  const projectName = String(item.projectName ?? '').trim();
  const schemaName = String(item.schemaName ?? '').trim();
  const titlePrefix = `${projectName}${schemaName}`.trim();
  const projectId = item.projectId === undefined ? '' : String(item.projectId);

  return {
    id: String(item.id),
    link: projectId
      ? `/vpp/analysis-revenue/energy-storage-project/plan?projectId=${encodeURIComponent(projectId)}`
      : undefined,
    time: item.createTime ?? '',
    title: titlePrefix
      ? `${titlePrefix}已完成，请查看`
      : '测算方案已完成，请查看',
    type: 'system',
  };
}

export async function getWorkbenchWeatherLocationApi(): Promise<WorkbenchWeatherLocation> {
  const ip = await getPublicIp();
  const res = await requestClient.get<WorkbenchWeatherLocation>(
    `${basePath}/weather/current`,
    {
      headers: {
        'Deframe-ip': ip?.data?.origin,
      },
    },
  );
  return res ?? {};
}

export async function getRevenueSchemeShareMessageListApi(): Promise<
  WorkbenchMessageItem[]
> {
  const res = await requestClient.get<RevenueSchemeShareMessageApiItem[]>(
    `${basePath}/revenue-scheme-share/list`,
  );
  return Array.isArray(res)
    ? res.map((item) => normalizeRevenueSchemeShareMessage(item))
    : [];
}

export async function getWorkbenchAppConfigListApi(): Promise<
  WorkbenchAppConfigApiItem[]
> {
  const res = await requestClient.get<WorkbenchAppConfigApiItem[]>(
    `${basePath}/app-config/list`,
  );
  return Array.isArray(res) ? res : [];
}

export async function getWorkbenchAppConfigDetailApi(
  id: number | string,
): Promise<WorkbenchAppConfigDetailApiItem> {
  return requestClient.get<WorkbenchAppConfigDetailApiItem>(
    `${basePath}/app-config/detail/${id}`,
  );
}

export async function createWorkbenchAppConfigApi(
  data: CreateWorkbenchAppConfigParams,
) {
  return requestClient.post(`${basePath}/app-config/create`, data);
}

export async function deleteWorkbenchAppConfigApi(id: number | string) {
  return requestClient.post(`${basePath}/app-config/delete/${id}`);
}

/**
 * 获取当前天气
 * @param params 包含 latitude 和 longitude 的参数
 */
export async function getCurrentWeatherApi(params: {
  latitude: string;
  longitude: string;
}): Promise<CurrentWeatherResponse> {
  const { latitude, longitude } = params;
  return requestClient.post<CurrentWeatherResponse>(
    `/kdp-predict-service/internal/external/weather/current?latitude=${latitude}&longitude=${longitude}`,
    {},
    {
      responseReturn: 'body',
    },
  );
}
