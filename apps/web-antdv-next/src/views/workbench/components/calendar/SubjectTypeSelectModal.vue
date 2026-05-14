<script lang="ts" setup>
import type { DictOptionItem } from '#/api/dict';

/**
 * 主体类型选择弹框
 * @author inspur-iep-ai
 */
import { computed, onMounted, ref } from 'vue';

import { VbenButton } from '@vben/common-ui';
import { i18n } from '@vben/locales';
import { usePreferences } from '@vben/preferences';

import { Modal } from 'antdv-next';

import { DictCodes, getDictOptionsApi } from '#/api/dict';
import { $t } from '#/locales';

interface SubjectTypeOption {
  id: number;
  title: string;
  icon: string;
  iconColor: string; // 图标颜色
}

defineOptions({ name: 'SubjectTypeSelectModal' });

defineProps<Props>();

const emit = defineEmits<Emits>();

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', value: number): void;
}

// 选中的类型
const selectedType = ref<null | number>(null);

// hover 状态
const hoverIndex = ref<null | number>(null);

// 暗黑模式状态（响应式，来自框架偏好配置）
const { isDark } = usePreferences();

// 获取当前语言
const currentLocale = computed(() => i18n.global.locale.value);

// 字典原始数据
const dictOptions = ref<DictOptionItem[]>([]);
const loading = ref(false);

// 图标映射：根据主体类型值映射图标和颜色
// 1-虚拟电厂(grid紫色), 2-发电企业(bolt绿色), 3-售电公司(building蓝色)
const iconMap: Record<number, { icon: string; iconColor: string }> = {
  1: { icon: 'grid', iconColor: '#9333ea' },
  2: { icon: 'bolt', iconColor: '#059669' },
  3: { icon: 'building', iconColor: '#2563eb' },
};

// 从字典数据转换为选项数据（国际化处理）
const options = computed<SubjectTypeOption[]>(() => {
  return dictOptions.value.map((item) => ({
    id: Number(item.value),
    title:
      currentLocale.value === 'en-US' ? item.labelEn || item.label : item.label,
    icon: iconMap[Number(item.value)]?.icon || 'bolt',
    iconColor: iconMap[Number(item.value)]?.iconColor || '#059669',
  }));
});

// 加载字典数据
async function loadDictOptions() {
  loading.value = true;
  try {
    dictOptions.value = await getDictOptionsApi(
      DictCodes.ENTITY_TRADE_ENTITY_TYPE,
    );
  } catch (error) {
    console.error('加载主体类型字典失败:', error);
    // 使用备用静态数据
    dictOptions.value = [
      {
        label: $t('tradingCalendar.subjectTypeModal.options.virtualPowerPlant'),
        value: 1,
      },
      {
        label: $t('tradingCalendar.subjectTypeModal.options.powerPlant'),
        value: 2,
      },
      {
        label: $t('tradingCalendar.subjectTypeModal.options.retailCompany'),
        value: 3,
      },
    ];
  } finally {
    loading.value = false;
  }
}

// 组件挂载时加载字典
onMounted(() => {
  loadDictOptions();
});

// 处理确认选择
function handleConfirm() {
  if (!selectedType.value) {
    return;
  }
  emit('confirm', selectedType.value);
  handleCancel();
}

// 处理取消
function handleCancel() {
  selectedType.value = null;
  emit('update:visible', false);
}

// 监听弹框关闭
function handleAfterClose() {
  selectedType.value = null;
}

// 获取选项样式
function getItemStyle(index: number, isSelected: boolean) {
  const baseStyle: any = {
    height: '65px',
    marginBottom: '12px',
    borderRadius: '8px',
    padding: '0 16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  };

  // 暗黑模式样式
  if (isDark.value) {
    baseStyle.border = '1px solid #38393a';
    baseStyle.backgroundColor = '#242424';

    // 选中状态（暗黑模式）
    if (isSelected) {
      baseStyle.backgroundColor = 'rgba(39, 141, 242, 0.2)';
      baseStyle.borderColor = '#006CE6';
    }
    // hover 状态（仅未选中时，暗黑模式）
    else if (hoverIndex.value === index) {
      baseStyle.backgroundColor = 'rgba(39, 141, 242, 0.2)';
    }
  } else {
    // 亮色模式样式
    baseStyle.border = '2px solid #e5e7eb';
    baseStyle.backgroundColor = '#ffffff';

    // 选中状态（亮色模式）
    if (isSelected) {
      baseStyle.backgroundColor = '#DDE8FC';
      baseStyle.borderColor = '#006CE6';
    }
    // hover 状态（仅未选中时，亮色模式）
    else if (hoverIndex.value === index) {
      baseStyle.backgroundColor = '#DDE8FC';
    }
  }

  return baseStyle;
}
</script>

<template>
  <Modal
    :open="visible"
    :title="$t('tradingCalendar.subjectTypeModal.title')"
    :width="520"
    :footer="null"
    @cancel="handleCancel"
    @after-close="handleAfterClose"
  >
    <div class="py-4">
      <!-- 选项列表 -->
      <div>
        <div
          v-for="(option, index) in options"
          :key="option.id"
          @click="selectedType = option.id"
          @mouseenter="hoverIndex = index"
          @mouseleave="hoverIndex = null"
          :style="getItemStyle(index, selectedType === option.id)"
        >
          <!-- 图标区域 -->
          <div
            class="mr-3 flex-center size-10 rounded-md transition-colors"
            :style="{
              color: option.iconColor,
            }"
          >
            <!-- 闪电图标 - 发电侧 -->
            <img v-if="option.icon === 'bolt'" src="./svg/fadian.svg" alt="" />
            <!-- 建筑图标 - 售电侧 -->
            <img
              v-else-if="option.icon === 'building'"
              src="./svg/shoudian.svg"
              alt=""
            />
            <!-- 网格图标 - 虚拟电厂 -->
            <img
              v-else-if="option.icon === 'grid'"
              src="./svg/xndc.svg"
              alt=""
            />
          </div>

          <!-- 文本区域 -->
          <div class="flex-1">
            <div
              class="text-base font-medium"
              :class="[
                selectedType === option.id
                  ? isDark
                    ? 'text-gray-100'
                    : 'text-gray-900'
                  : isDark
                    ? 'text-gray-300'
                    : 'text-gray-700',
              ]"
            >
              {{ option.title }}
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="mt-6 flex justify-end gap-3">
        <VbenButton
          variant="outline"
          class="cursor-pointer"
          @click="handleCancel"
        >
          {{ $t('tradingCalendar.subjectTypeModal.buttons.cancel') }}
        </VbenButton>
        <VbenButton class="cursor-pointer" @click="handleConfirm">
          {{ $t('tradingCalendar.subjectTypeModal.buttons.confirm') }}
        </VbenButton>
      </div>
    </div>
  </Modal>
</template>
