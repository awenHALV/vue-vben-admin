<script setup lang="ts">
import type { DeptTreeNode, InviteUserSearchResult } from '#/api/system/user';

import { onMounted, ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Checkbox, message, Modal, Spin, TreeSelect } from 'antdv-next';

import {
  confirmInviteUserApi,
  getDeptTreeApi,
  searchInviteUserApi,
} from '#/api/system/user';
import { usePageButtonAccess } from '#/composables/use-page-button-access';
import { $t } from '#/locales';

import defaultPng from './assets/default.png';
import emptyPng from './assets/empty.png';
import UserPng from './assets/user.png';
import { AGENCY_PAGE_BUTTON_CODES } from './button-permissions';

defineOptions({ name: 'SystemAgency' });

const { canButton } = usePageButtonAccess(AGENCY_PAGE_BUTTON_CODES);

const phoneNumber = ref('');
const loading = ref(false);
const result = ref<InviteUserSearchResult | null>(null);
const hasSearched = ref(false);

const confirmModalVisible = ref(false);
const agreePrivacy = ref(false);
const confirmLoading = ref(false);

const selectedDeptId = ref<string | undefined>(undefined);
const deptTreeData = ref<DeptTreeNode[]>([]);
const deptTreeLoading = ref(false);

async function handleFetchDeptTree() {
  deptTreeLoading.value = true;
  try {
    const data = await getDeptTreeApi({
      deptType: 'OPERATION'
    });
    deptTreeData.value = data || [];
  } catch (error) {
    console.error(error);
  } finally {
    deptTreeLoading.value = false;
  }
}

onMounted(() => {
  handleFetchDeptTree();
});

async function handleSearch() {
  if (!phoneNumber.value) return;
  loading.value = true;
  hasSearched.value = true;

  try {
    const data = await searchInviteUserApi({ phone: phoneNumber.value });
    result.value = data;
  } catch (error) {
    console.error(error);
    result.value = null;
  } finally {
    loading.value = false;
  }
}

function handleOpenConfirmModal() {
  agreePrivacy.value = false;
  confirmModalVisible.value = true;
}

async function handleConfirmInvite() {
  if (!agreePrivacy.value || !result.value) return;
  if (!selectedDeptId.value) {
    message.warning($t('system.user.orgPlaceholder'));
    return;
  }

  confirmLoading.value = true;
  try {
    await confirmInviteUserApi({
      userId: result.value.userId,
      agreePrivacyPolicy: agreePrivacy.value,
      deptId: selectedDeptId.value,
    });
    message.success('代运营邀请成功');
    confirmModalVisible.value = false;
    // 重新搜索以刷新状态
    handleSearch();
  } catch (error) {
    console.error(error);
  } finally {
    confirmLoading.value = false;
  }
}
</script>

<template>
  <Page auto-content-height content-class="flex flex-col gap-3 p-4">
    <!-- 搜索区域 -->
    <div
      class="flex flex-col gap-4 rounded-lg border border-border bg-background p-5"
    >
      <div class="text-sm leading-[22px]">
        {{ $t('system.agency.tips') }}
      </div>
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm">{{ $t('system.agency.phone') }}</span>
          <VbenInput
            v-model="phoneNumber"
            class="w-56 [&_input]:h-8"
            allow-clear
            :placeholder="$t('system.agency.phonePlaceholder')"
            @keydown.enter="handleSearch"
          />
        </div>
        <div class="ml-auto flex shrink-0 items-center justify-end">
          <VbenButton
            class="w-[60px] cursor-pointer"
            size="sm"
            variant="default"
            :loading="loading"
            @click="handleSearch"
          >
            {{ $t('menu.action.search') }}
          </VbenButton>
        </div>
      </div>
    </div>

    <!--搜索结果区域-->
    <div
      class="min-h-0 flex-1 rounded-lg border border-border bg-background p-5 flex flex-col"
    >
      <div class="mb-4 text-base font-medium">
        {{ $t('system.agency.searchTitle') }}
      </div>

      <div class="flex-1 min-h-0 flex flex-col">
        <Spin :spinning="loading" class="flex-1 h-full">
          <!-- DEFAULT (Before Search) -->
          <div v-if="!hasSearched" class="flex flex-col items-center justify-center h-full">
            <img :src="defaultPng" alt="default"
class="mb-4 w-48" />
            <div class="text-base leading-[22px] font-medium text-foreground">
              {{ $t('system.agency.defaultTitle') }}
            </div>
            <div class="mt-1 text-sm text-muted-foreground">
              {{ $t('system.agency.defaultDesc') }}
            </div>
          </div>

          <div v-else class="search-content flex flex-col h-full">
            <!-- NOT_FOUND -->
            <div
              v-if="result?.status === 'NOT_FOUND' || !result"
              class="flex flex-col items-center justify-center h-full"
            >
              <img :src="emptyPng" alt="empty"
class="mb-4 w-48" />
              <div class="text-base leading-[22px] font-medium text-foreground">
                {{ $t('system.agency.notFoundTitle') }}
              </div>
              <div class="mt-1 text-sm text-muted-foreground">
                {{ $t('system.agency.notFoundDesc') }}
              </div>
            </div>

            <div
              v-else
              class="flex w-fit items-center justify-start gap-5 rounded-lg bg-[#F7F8FA] p-5"
            >
              <div class="flex items-center gap-4">
                <div
                  class="flex-center size-10 rounded-full bg-primary text-white"
                >
                  <img :src="UserPng" alt="avatar"
class="size-6" />
                </div>
                <div>
                  <div class="text-base font-medium">{{ result.name }}</div>
                  <div class="mt-1 text-sm text-muted-foreground">
                    {{ $t('system.agency.account') }}: {{ result.account }} |
                    {{ $t('system.agency.phone') }}: {{ result.phone }}
                  </div>
                </div>
              </div>

              <!-- Status or Action -->
              <div v-if="result.status === 'ALREADY_IN_TENANT'">
                <div
                  class="flex items-center gap-1 rounded-sm border border-[#FFE58F] bg-[#FFFBE6] px-3 py-1 text-sm text-[#FAAD14]"
                >
                  <IconifyIcon icon="lucide:info" class="size-4" />
                  {{ $t('system.agency.alreadyInTenant') }}
                </div>
              </div>
              <div v-else-if="result.status === 'NORMAL'">
                <VbenButton
                  v-if="canButton(AGENCY_PAGE_BUTTON_CODES.add)"
                  variant="default"
                  size="sm"
                  class="cursor-pointer"
                  @click="handleOpenConfirmModal"
                >
                  {{ $t('system.agency.addAgency') }}
                </VbenButton>
              </div>
            </div>
          </div>
        </Spin>
      </div>
    </div>

    <!-- 确认添加代运营弹窗 -->
    <Modal
      v-model:open="confirmModalVisible"
      centered
      :footer="null"
      :width="600"
      @cancel="confirmModalVisible = false"
    >
      <template #title>
        <div class="flex items-center gap-2 py-1">
          <IconifyIcon
            icon="lucide:alert-triangle"
            class="size-5 text-orange-500"
          />
          <span class="text-[18px] font-semibold">{{
            $t('system.agency.confirmTitle')
          }}</span>
        </div>
      </template>

      <div class="flex flex-col gap-6 px-1 py-4">
        <div class="text-[16px] text-[#333]">
          {{
            $t('system.agency.confirmContent', {
              name: result?.name,
              phone: result?.phone,
            })
          }}
        </div>



        <div class="org-wrap">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-1">
              <IconifyIcon
                icon="material-symbols:account-balance-rounded"
                class="size-5 text-primary"
              />
              <span class="text-[14px] font-medium">{{
                $t('system.agency.relatedOrg')
              }}</span>
              <span class="font-bold text-red-500">*</span>
            </div>
            <!-- <div
              class="flex items-center gap-1 rounded-sm border border-blue-100 bg-blue-50 px-2 py-1 text-[12px] text-blue-500"
            >
              <IconifyIcon icon="lucide:info" class="size-3.5" />
              关联后用户才会在用户管理中显示
            </div> -->
          </div>

          <div class="flex items-center gap-2">
            <TreeSelect
              v-model:value="selectedDeptId"
              :tree-data="deptTreeData"
              :placeholder="$t('system.user.orgPlaceholder')"
              class="flex-1"
              show-search
              tree-default-expand-all
              :field-names="{
                label: 'deptName',
                value: 'id',
                children: 'children',
              }"
            />
            <div
              class="flex-center size-7 shrink-0 cursor-pointer rounded-sm text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
              @click="handleFetchDeptTree"
            >
              <IconifyIcon
                icon="lucide:rotate-ccw"
                class="size-4"
                :class="[deptTreeLoading ? 'animate-spin' : '']"
              />
            </div>
          </div>

          <div
            class="mt-3 flex items-start gap-2 rounded-md border border-gray-100 bg-gray-50/80 p-3 text-xs/relaxed text-muted-foreground"
          >
            <IconifyIcon
              icon="lucide:info"
              class="mt-0.5 size-4 shrink-0 text-gray-400"
            />
            <div>
              {{ $t('system.agency.orgNotFoundTip') }}
              <a
                href="/system/user-center/org"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary hover:underline"
              >
                {{ $t('system.agency.orgManagement') }}
                <IconifyIcon
                  icon="lucide:external-link"
                  class="inline size-3"
                />
              </a>
              {{ $t('system.agency.orgActionTip') }}
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2">
          <Checkbox v-model:checked="agreePrivacy" class="mt-0.5" />
          <div class="text-[14px] text-[#666]">
            {{ $t('system.agency.privacyPrefix') }}
            <a
              href="javascript:;"
              class="text-primary italic hover:underline"
              >{{ $t('system.agency.privacyLink') }}</a
            >
            {{ $t('system.agency.privacySuffix') }}
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-3">
          <VbenButton
            variant="outline"
            class="h-10 w-[80px] text-[14px]"
            @click="confirmModalVisible = false"
          >
            {{ $t('common.cancel') }}
          </VbenButton>
          <VbenButton
            variant="default"
            class="h-10 w-[120px] bg-primary text-[14px] text-white"
            :disabled="!agreePrivacy"
            :loading="confirmLoading"
            @click="handleConfirmInvite"
          >
            {{ $t('system.agency.confirmAdd') }}
          </VbenButton>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
:deep(.ant-spin-nested-loading),
:deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}
</style>
