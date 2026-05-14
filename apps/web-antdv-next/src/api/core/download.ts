/**
 * @author inspur-iep-ai
 * 下载中心 API
 */
import { requestClient } from '#/api/request';

/**
 * 文件日志VO
 */
export interface FileLogVo {
  /** 主键 */
  id: number;
  /** 文件名称 */
  fileName: string;
  /** 文件下载链接 */
  fileLink: string;
  /** 文件状态，字典 sys_file_generate_status */
  status: string;
  /** 文件生成时间 */
  generateTime?: string;
}

/**
 * 分页参数
 */
export interface PageParams {
  current: number;
  size: number;
}

/**
 * 分页结果
 */
export interface PageResult<T> {
  records: T[];
  total: number;
}

/**
 * 获取下载中心分页列表
 * @param params 分页参数
 * @returns 分页结果
 */
export async function getDownloadPageApi(
  params: PageParams,
): Promise<PageResult<FileLogVo>> {
  const res = await requestClient.get(
    '/de-base-system/external/private/download-center/file-logs',
    { params },
  );
  return {
    records: res?.records || [],
    total: res?.total || 0,
  };
}
