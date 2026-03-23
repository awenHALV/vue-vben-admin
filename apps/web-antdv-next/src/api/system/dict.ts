/**
 * 字典 API 接口
 */
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** 字典选项 */
export interface DictOption {
  optionKey: string;
  optionValue: string;
  optionValueEn?: string;
}

// ==================== API 函数 ====================

/**
 * 根据字典编码获取字典选项
 * @param dictCode 字典编码
 */
export async function getDictOptionsApi(dictCode: string) {
  return requestClient.get<DictOption[]>('/de-base-system/external/private/dict/option', {
    params: { dictCode }
  });
}