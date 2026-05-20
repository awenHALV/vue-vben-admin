/**
 * 行业资讯配置 API
 */
import { requestClient } from '#/api/request';

export type IndustryNewsCategory = 'news' | 'other' | 'policy' | 'report';

/** 后端行业资讯字段 */
export interface IndustryNewsApiItem {
  id: number | string;
  newsType: IndustryNewsCategory | string;
  newsTypeLabel?: string;
  publishTime: string;
  sourcePlatform: string;
  title: string;
  url: string;
}

/** 页面使用的行业资讯字段 */
export interface IndustryNewsItem {
  category: IndustryNewsCategory | string;
  id: string;
  newsTypeLabel?: string;
  publishTime: string;
  source: string;
  title: string;
  url: string;
}

export interface IndustryNewsPageParams {
  current?: number;
  newsType?: string;
  orderBy?: string;
  size?: number;
  title?: string;
}

export interface IndustryNewsPageResult {
  items: IndustryNewsItem[];
  total: number;
}

interface IndustryNewsPageData {
  current?: number;
  pages?: number;
  records?: IndustryNewsApiItem[];
  size?: number;
  total?: number;
}

export interface CreateIndustryNewsParams {
  newsType: string;
  publishTime: string;
  sourcePlatform: string;
  title: string;
  url: string;
}

export interface UpdateIndustryNewsParams extends CreateIndustryNewsParams {
  id: number | string;
}

const basePath = '/de-base-system/external/private/industry-news';

function normalizeIndustryNewsItem(
  item: IndustryNewsApiItem,
): IndustryNewsItem {
  return {
    category: item.newsType,
    id: String(item.id),
    newsTypeLabel: item.newsTypeLabel,
    publishTime: item.publishTime,
    source: item.sourcePlatform,
    title: item.title,
    url: item.url,
  };
}

export function toIndustryNewsCreateParams(
  data: IndustryNewsItem,
): CreateIndustryNewsParams {
  return {
    newsType: data.category,
    publishTime: data.publishTime,
    sourcePlatform: data.source,
    title: data.title,
    url: data.url,
  };
}

export function toIndustryNewsUpdateParams(
  data: IndustryNewsItem,
): UpdateIndustryNewsParams {
  return {
    ...toIndustryNewsCreateParams(data),
    id: data.id,
  };
}

/** 分页查询行业资讯 */
export async function getIndustryNewsPageApi(
  params: IndustryNewsPageParams,
): Promise<IndustryNewsPageResult> {
  const res = await requestClient.get<IndustryNewsPageData>(
    `${basePath}/page`,
    {
      params,
    },
  );
  const records = Array.isArray(res?.records) ? res.records : [];

  return {
    items: records.map((item) => normalizeIndustryNewsItem(item)),
    total: Number(res?.total ?? records.length),
  };
}

/** 列表查询行业资讯 */
export async function getIndustryNewsListApi(): Promise<IndustryNewsItem[]> {
  const res = await requestClient.get<IndustryNewsApiItem[]>(
    `${basePath}/list`,
  );
  return Array.isArray(res)
    ? res.map((item) => normalizeIndustryNewsItem(item))
    : [];
}

/** 查询行业资讯详情 */
export async function getIndustryNewsDetailApi(
  id: number | string,
): Promise<IndustryNewsItem> {
  const res = await requestClient.get<IndustryNewsApiItem>(
    `${basePath}/detail/${id}`,
  );
  return normalizeIndustryNewsItem(res);
}

/** 新增行业资讯 */
export async function createIndustryNewsApi(data: CreateIndustryNewsParams) {
  return requestClient.post(`${basePath}/create`, data);
}

/** 编辑行业资讯 */
export async function updateIndustryNewsApi(data: UpdateIndustryNewsParams) {
  return requestClient.post(`${basePath}/update`, data);
}

/** 删除行业资讯 */
export async function deleteIndustryNewsApi(id: number | string) {
  return requestClient.post(`${basePath}/delete/${id}`);
}
