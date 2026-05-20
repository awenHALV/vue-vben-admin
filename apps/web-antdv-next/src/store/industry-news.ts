import type { SelectProps } from 'antdv-next';

import type {
  CreateIndustryNewsParams,
  IndustryNewsItem,
  UpdateIndustryNewsParams,
} from '#/api/system/industry-news';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import { getDictOptionsApi } from '#/api/system/dict';
import {
  createIndustryNewsApi,
  deleteIndustryNewsApi,
  getIndustryNewsDetailApi,
  getIndustryNewsListApi,
  getIndustryNewsPageApi,
  updateIndustryNewsApi,
} from '#/api/system/industry-news';

/**
 * @zh_CN 行业资讯 Store
 * 用于管理行业资讯的增删改查，并支持跨组件数据同步
 */
export const useIndustryNewsStore = defineStore('industry-news', () => {
  // ==================== State ====================
  /** 行业资讯列表 */
  const newsList = ref<IndustryNewsItem[]>([]);

  /** 加载状态 */
  const loading = ref(false);

  /** 错误信息 */
  const error = ref<null | string>(null);

  /** 当前选中的资讯 */
  const currentNews = ref<IndustryNewsItem | null>(null);

  /** 分类选项 */
  const categoryOptions = ref<SelectProps['options']>([]);

  // ==================== Getters ====================

  /**
   * 分类映射表（用于标签颜色等）
   */
  const categoryMap = computed<
    Record<string, { color: string; label: string }>
  >(() => {
    const colorMap: Record<string, string> = {
      news: 'green',
      other: 'default',
      policy: 'blue',
      report: 'orange',
    };

    const map: Record<string, { color: string; label: string }> = {};
    for (const option of categoryOptions.value ?? []) {
      const value = String(option.value ?? '');
      if (value) {
        map[value] = {
          color: colorMap[value] ?? 'default',
          label: String(option.label ?? value),
        };
      }
    }
    return map;
  });

  /**
   * 获取最新的N条资讯
   */
  function getLatestNews(count: number = 5): IndustryNewsItem[] {
    return newsList.value.slice(0, count);
  }

  /**
   * 按分类筛选资讯
   */
  function getNewsByCategory(category: string): IndustryNewsItem[] {
    return newsList.value.filter((item) => item.category === category);
  }

  /**
   * 资讯总数
   */
  const totalCount = () => newsList.value.length;

  // ==================== Actions ====================

  /**
   * 加载分类选项
   */
  async function loadCategoryOptions(): Promise<void> {
    try {
      const options = await getDictOptionsApi('sys_news_type');
      categoryOptions.value = options.map((item) => ({
        label: item.optionValue,
        value: item.optionKey,
      }));
    } catch (error_) {
      console.error('加载分类选项失败:', error_);
      categoryOptions.value = [];
    }
  }

  /**
   * 加载行业资讯列表
   */
  async function loadNewsList(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const res = await getIndustryNewsListApi();
      newsList.value = res;
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '加载失败';
      console.error('加载行业资讯失败:', error_);
      newsList.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * 加载行业资讯列表（分页）
   */
  async function loadNewsPage(params: any): Promise<IndustryNewsItem[]> {
    loading.value = true;
    error.value = null;

    try {
      const res = await getIndustryNewsPageApi(params);
      console.log(res);
      newsList.value = res.items;
      return await getIndustryNewsPageApi(params);
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '加载失败';
    }
  }

  /**
   * 获取资讯详情
   */
  async function fetchNewsDetail(id: number | string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const res = await getIndustryNewsDetailApi(id);
      currentNews.value = res;
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '获取详情失败';
      console.error('获取资讯详情失败:', error_);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 新增资讯
   */
  async function createNews(data: CreateIndustryNewsParams): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      await createIndustryNewsApi(data);
      // 创建成功后刷新列表
      await loadNewsList();
      return true;
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '创建失败';
      console.error('创建资讯失败:', error_);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 更新资讯
   */
  async function updateNews(data: UpdateIndustryNewsParams): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      await updateIndustryNewsApi(data);
      // 更新成功后刷新列表
      await loadNewsList();
      return true;
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '更新失败';
      console.error('更新资讯失败:', error_);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 删除资讯
   */
  async function deleteNews(id: number | string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      await deleteIndustryNewsApi(id);
      // 删除成功后从列表中移除
      newsList.value = newsList.value.filter((item) => item.id !== String(id));
      return true;
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '删除失败';
      console.error('删除资讯失败:', error_);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 刷新资讯列表（强制重新加载）
   */
  async function refreshNewsList(): Promise<void> {
    return loadNewsList();
  }

  /**
   * 清空当前选中的资讯
   */
  function clearCurrentNews(): void {
    currentNews.value = null;
  }

  /**
   * 清空错误信息
   */
  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    categoryOptions,
    currentNews,
    error,
    loading,
    newsList,

    // Getters
    categoryMap,
    getLatestNews,
    getNewsByCategory,
    totalCount,

    // Actions
    clearCurrentNews,
    clearError,
    createNews,
    deleteNews,
    fetchNewsDetail,
    loadCategoryOptions,
    loadNewsList,
    refreshNewsList,
    updateNews,
    loadNewsPage,
  };
});
