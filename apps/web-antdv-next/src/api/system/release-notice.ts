/**
 * 发版管理配置 API
 */
import { requestClient } from '#/api/request';

export type ReleaseNoticeStatus = 'draft' | 'published';

export interface ReleaseNoticeApiItem {
  content: string;
  createTime: string;
  id: number | string;
  status: number;
  summary?: string;
  title: string;
}

export interface ReleaseNoticeItem {
  content: string;
  createTime: string;
  description: string;
  id: string;
  publishTime: string;
  status: ReleaseNoticeStatus;
  title: string;
}

export interface ReleaseNoticePageParams {
  current?: number;
  orderBy?: string;
  size?: number;
  title?: string;
}

export interface ReleaseNoticePageResult {
  items: ReleaseNoticeItem[];
  total: number;
}

interface ReleaseNoticePageData {
  current?: number;
  pages?: number;
  records?: ReleaseNoticeApiItem[];
  size?: number;
  total?: number;
}

export interface CreateReleaseNoticeParams {
  content: string;
  summary?: string;
  title: string;
}

export interface UpdateReleaseNoticeParams extends CreateReleaseNoticeParams {
  id: number | string;
}

const basePath = '/de-base-system/external/private/release-notice';

function normalizeReleaseNoticeStatus(status: number): ReleaseNoticeStatus {
  return status === 1 ? 'published' : 'draft';
}

function normalizeReleaseNoticeItem(
  item: ReleaseNoticeApiItem,
): ReleaseNoticeItem {
  return {
    content: item.content,
    createTime: item.createTime,
    description: item.summary ?? '',
    id: String(item.id),
    publishTime: item.createTime,
    status: normalizeReleaseNoticeStatus(item.status),
    title: item.title,
  };
}

export function toReleaseNoticeCreateParams(
  data: ReleaseNoticeItem,
): CreateReleaseNoticeParams {
  return {
    content: data.content,
    summary: data.description,
    title: data.title,
  };
}

export function toReleaseNoticeUpdateParams(
  data: ReleaseNoticeItem,
): UpdateReleaseNoticeParams {
  return {
    ...toReleaseNoticeCreateParams(data),
    id: data.id,
  };
}

/** 分页查询发版通知 */
export async function getReleaseNoticePageApi(
  params: ReleaseNoticePageParams,
): Promise<ReleaseNoticePageResult> {
  const res = await requestClient.get<ReleaseNoticePageData>(
    `${basePath}/page`,
    {
      params,
    },
  );
  const records = Array.isArray(res?.records) ? res.records : [];

  return {
    items: records.map((item) => normalizeReleaseNoticeItem(item)),
    total: Number(res?.total ?? records.length),
  };
}

/** 查询已发布发版通知列表 */
export async function getPublishedReleaseNoticeListApi(): Promise<
  ReleaseNoticeItem[]
> {
  const res = await requestClient.get<ReleaseNoticeApiItem[]>(
    `${basePath}/list-published`,
  );
  return Array.isArray(res)
    ? res.map((item) => normalizeReleaseNoticeItem(item))
    : [];
}

/** 查询发版通知详情 */
export async function getReleaseNoticeDetailApi(
  id: number | string,
): Promise<ReleaseNoticeItem> {
  const res = await requestClient.get<ReleaseNoticeApiItem>(
    `${basePath}/detail/${id}`,
  );
  return normalizeReleaseNoticeItem(res);
}

/** 新增发版通知 */
export async function createReleaseNoticeApi(data: CreateReleaseNoticeParams) {
  return requestClient.post(`${basePath}/create`, data);
}

/** 编辑发版通知 */
export async function updateReleaseNoticeApi(data: UpdateReleaseNoticeParams) {
  return requestClient.post(`${basePath}/update`, data);
}

/** 删除发版通知 */
export async function deleteReleaseNoticeApi(id: number | string) {
  return requestClient.post(`${basePath}/delete/${id}`);
}

/** 发布发版通知 */
export async function publishReleaseNoticeApi(id: number | string) {
  return requestClient.post(`${basePath}/publish/${id}`);
}

/** 下线发版通知 */
export async function unpublishReleaseNoticeApi(id: number | string) {
  return requestClient.post(`${basePath}/unpublish/${id}`);
}
