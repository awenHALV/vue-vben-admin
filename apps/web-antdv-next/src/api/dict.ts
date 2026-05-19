import { ref } from 'vue';

import { requestClient } from '#/api/request';

/**
 * 字典选项项
 * @author inspur-iep-ai
 */
export interface DictOptionItem {
  label: string;
  labelEn: string;
  value: number | string;
  disabled?: boolean;
  [key: string]: any;
}

/**
 * 字典编码常量定义
 * 根据字典接口规范定义
 * @author inspur-iep-ai
 */
export const DictCodes = {
  /** 聚合单元类型: 1-发电类、2-储能类、3-全电量负荷类、4-调节量负荷类 */
  ENTITY_AGGREGATION_UNIT_TYPE: 'entity_aggregation_unit_type',
  /** 参与市场类型: 1-电能量市场、2-需求响应、3-辅助服务 */
  ENTITY_PARTICIPATION_MARKET_TYPE: 'entity_participation_market_type',
  /** 聚合单元状态: 1-开机、2-停机、3-故障 */
  ENTITY_AGGREGATION_UNIT_STATUS: 'entity_aggregation_unit_status',
  /** 基准电压等级 */
  ENTITY_BASE_VOLTAGE_LEVEL: 'entity_base_voltage_level',
  /** 电网节点功能分类 */
  ENTITY_GRID_NODE_FUNCTION_TYPE: 'entity_grid_node_function_type',
  /** 合约方案类型 */
  ENTITY_CONTRACT_SCHEME_TYPE: 'entity_contract_scheme_type',
  /** 用电类别 */
  ENTITY_ELECTRICITY_CONSUMPTION_CATEGORY:
    'entity_electricity_consumption_category',
  /** 发电类别 */
  ENTITY_POWER_GENERATION_CATEGORY: 'entity_power_generation_category',
  /** 发电单元类型 */
  ENTITY_POWER_GENERATION_UNIT_TYPE: 'entity_power_generation_unit_type',
  /** 套餐类型 */
  ENTITY_PACKAGE_TYPE: 'entity_package_type',
  /** 市场化属性 */
  ENTITY_MARKET_ATTRIBUTE: 'entity_market_attribute',
  /** 结算类型 */
  ENTITY_SETTLEMENT_TYPE: 'entity_settlement_type',
  /** 分路类型: 1-光伏、2-储能、3-充电、4-负荷、5-风电 */
  ENTITY_BRANCH_TYPE: 'entity_branch_type',
  /** 分成方案 */
  ENTITY_PROFIT_SHARING_SCHEME: 'entity_profit_sharing_scheme',
  /** 托底方案 */
  ENTITY_BACKSTOP_SCHEME: 'entity_backstop_scheme',
  /** 合约状态 */
  ENTITY_CONTRACT_STATUS: 'entity_contract_status',
  /** 交易主体类型: 1-虚拟电厂、2-发电企业、3-售电公司 */
  ENTITY_TRADE_ENTITY_TYPE: 'entity_trade_entity_type',
  /** 交易主体运营状态: 1-运行、2-停运 */
  ENTITY_TRADE_ENTITY_OPERATION_STATUS: 'entity_trade_entity_operation_status',
  /** 供电单位层级 */
  ENTITY_POWER_SUPPLY_UNIT_LEVEL: 'entity_power_supply_unit_level',
  /** 用电类型 */
  ENTITY_ELECTRIC_TYPE: 'entity_electric_type',
  /** 交易方向 */
  TRANS_DIRECTION: 'trans_direction',
  /** 交易分类 */
  TRANS_LTS_CLASSIFY: 'trans_lts_classify',
  /** 交易类型 */
  TRANS_LTS_TYPE: 'trans_lts_type',
  /** 价格填报方式 */
  TRANS_LTS_PRICE_TYPE: 'trans_lts_price_type',
  /** 出清状态 */
  TRANS_CLEAR_STATUS: 'trans_lts_clear_status',
  /** 预案状态 */
  TRANS_LTS_PLAN_STATUS: 'trans_lts_plan_status',
  /** 主体类型 */
  ENTITY_TYPE: 'entity_type',
  /** 中长期导出形式 */
  MID_LONG_TERM_EXPORT_TYPE: 'mid_long_term_export_type',
  /** 中长期导出原因 */
  MID_LONG_TERM_EXPORT_REASON: 'mid_long_term_export_reason',
  /** 测算收益参数数据类型: -1-负数、0-整数、1-正数、2正整数等 */
  REVENUE_DATA_TYPE: 'revenue_data_type',
} as const;

/**
 * 获取字典选项
 * @param dictCode 字典编码
 * @returns 字典选项列表
 * @author inspur-iep-ai
 */
export async function getDictOptionsApi(
  dictCode: string,
): Promise<DictOptionItem[]> {
  try {
    // 使用 requestClient 获取数据（已配置响应拦截器）
    const data = await requestClient.get<any[]>(
      '/de-base-system/external/private/dict/option',
      { params: { dictCode } },
    );

    // 转换数据格式：optionKey -> value, optionValue -> label
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        labelEn: item.optionValueEn || '',
        label: item.optionValue || '',
        value: item.optionKey ?? '',
      }));
    }

    return [];
  } catch (error) {
    console.error(`获取字典[${dictCode}]失败:`, error);
    return [];
  }
}

/**
 * 批量获取多个字典选项
 * @param dictCodes 字典编码数组
 * @returns 字典编码到选项列表的映射
 * @author inspur-iep-ai
 */
export async function getDictOptionsBatchApi(
  dictCodes: string[],
): Promise<Record<string, DictOptionItem[]>> {
  const promises = dictCodes.map(async (code) => {
    const options = await getDictOptionsApi(code);
    return { code, options };
  });
  const results = await Promise.all(promises);
  return results.reduce(
    (acc, { code, options }) => {
      acc[code] = options;
      return acc;
    },
    {} as Record<string, DictOptionItem[]>,
  );
}

/**
 * 字典缓存管理器
 * 用于缓存字典数据，避免重复请求
 * @author inspur-iep-ai
 */
class DictCache {
  private cache: Map<string, DictOptionItem[]> = new Map();
  private loading: Map<string, Promise<DictOptionItem[]>> = new Map();

  /**
   * 清除指定字典的缓存
   */
  clear(dictCode?: string) {
    if (dictCode) {
      this.cache.delete(dictCode);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取字典选项（带缓存）
   */
  async get(dictCode: string): Promise<DictOptionItem[]> {
    // 如果缓存中存在，直接返回
    if (this.cache.has(dictCode)) {
      return this.cache.get(dictCode)!;
    }

    // 如果正在加载中，返回同一个 Promise
    if (this.loading.has(dictCode)) {
      return this.loading.get(dictCode)!;
    }

    // 发起新请求
    const promise = getDictOptionsApi(dictCode).then((options) => {
      this.cache.set(dictCode, options);
      this.loading.delete(dictCode);
      return options;
    });

    this.loading.set(dictCode, promise);
    return promise;
  }

  /**
   * 获取缓存的字典选项（同步，可能返回空数组）
   */
  getSync(dictCode: string): DictOptionItem[] {
    return this.cache.get(dictCode) || [];
  }

  /**
   * 检查字典是否已缓存
   */
  has(dictCode: string): boolean {
    return this.cache.has(dictCode);
  }
}

// 导出单例缓存实例
export const dictCache = new DictCache();

/**
 * 使用字典的 Vue Composition API
 * @param dictCode 字典编码
 * @returns 字典选项和加载状态
 * @author inspur-iep-ai
 */
export function useDict(dictCode: string) {
  const options = ref<DictOptionItem[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      options.value = await dictCache.get(dictCode);
    } catch (error_) {
      error.value = error_ as Error;
      console.error(`加载字典[${dictCode}]失败:`, error_);
    } finally {
      loading.value = false;
    }
  }

  // 自动加载
  load();

  return {
    options,
    loading,
    error,
    reload: load,
  };
}

/**
 * 使用多个字典的 Vue Composition API
 * @param dictCodes 字典编码数组
 * @returns 字典映射和加载状态
 * @author inspur-iep-ai
 */
export function useDicts(dictCodes: string[]) {
  const dictMap = ref<Record<string, DictOptionItem[]>>({});
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const promises = dictCodes.map((code) =>
        dictCache.get(code).then((options) => ({ code, options })),
      );
      const results = await Promise.all(promises);
      dictMap.value = results.reduce(
        (acc, { code, options }) => {
          acc[code] = options;
          return acc;
        },
        {} as Record<string, DictOptionItem[]>,
      );
    } catch (error_) {
      error.value = error_ as Error;
      console.error('加载字典失败:', error_);
    } finally {
      loading.value = false;
    }
  }

  // 自动加载
  load();

  return {
    dictMap,
    loading,
    error,
    reload: load,
  };
}
