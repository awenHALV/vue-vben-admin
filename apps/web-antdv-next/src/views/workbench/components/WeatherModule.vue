<script lang="ts" setup>
import { computed, onMounted, reactive } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Avatar, Card, Typography } from 'antdv-next';
import dayjs from 'dayjs';

import { getWorkbenchWeatherLocationApi } from '#/api/workbench';
import { $t } from '#/locales';

const { Text: TypographyText, Title: TypographyTitle } = Typography;
const userStore = useUserStore();
const defaultAvatar =
  'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png';

// ==================== 欢迎与天气 ====================
const userName = computed(() => {
  const userInfo = userStore.userInfo;
  return (
    userInfo?.realName ||
    userInfo?.name ||
    userInfo?.username ||
    userInfo?.account ||
    $t('workbench.weather.defaultUser')
  );
});

const userAvatar = computed(() => userStore.userInfo?.avatar || defaultAvatar);

const greeting = computed(() => {
  const hour = dayjs().hour();
  const params = { name: userName.value };
  if (hour >= 0 && hour < 5) {
    return $t('workbench.weather.greetings.lateNight', params);
  }
  if (hour >= 5 && hour < 7) {
    return $t('workbench.weather.greetings.earlyMorning', params);
  }
  if (hour >= 7 && hour < 9) {
    return $t('workbench.weather.greetings.morning', params);
  }
  if (hour >= 9 && hour < 11) {
    return $t('workbench.weather.greetings.forenoon', params);
  }
  if (hour >= 11 && hour < 13) {
    return $t('workbench.weather.greetings.noon', params);
  }
  if (hour >= 13 && hour < 14) {
    return $t('workbench.weather.greetings.afterNoon', params);
  }
  if (hour >= 14 && hour < 17) {
    return $t('workbench.weather.greetings.afternoon', params);
  }
  if (hour >= 17 && hour < 19) {
    return $t('workbench.weather.greetings.dusk', params);
  }
  if (hour >= 19 && hour < 22) {
    return $t('workbench.weather.greetings.evening', params);
  }
  return $t('workbench.weather.greetings.night', params);
});

const currentDate = computed(() => ({
  date: dayjs().format('YYYY年MM月DD日'),
  weekday: dayjs().format('dddd'),
}));

const weatherData = reactive({
  city: '苏州工业园区',
  temperature: 24,
  weather: '多云',
  icon: 'lucide:cloud-sun',
});

async function loadWeatherLocation() {
  try {
    const location = await getWorkbenchWeatherLocationApi();
    weatherData.city = location.city || location.province || weatherData.city;
  } catch (error) {
    console.error('加载天气地理位置失败:', error);
  }
}

onMounted(() => {
  void loadWeatherLocation();
});
</script>

<template>
  <!-- 区域A：欢迎与天气 -->
  <Card class="welcome-card" :bordered="false">
    <div class="welcome-content">
      <div class="user-section">
        <div class="avatar-wrapper">
          <Avatar :size="44" :src="userAvatar" />
          <div class="avatar-ring"></div>
        </div>
        <div class="welcome-text">
          <TypographyTitle :level="5" class="mb-0">
            {{ greeting }}
          </TypographyTitle>
          <TypographyText type="secondary">
            {{ currentDate.date }} {{ currentDate.weekday }}
          </TypographyText>
        </div>
      </div>
      <div class="weather-section">
        <IconifyIcon :icon="weatherData.icon" class="weather-icon" />
        <div class="weather-info">
          <div class="city-name">{{ weatherData.city }}</div>
          <div class="temp-weather-row">
            <span class="temp-value">{{ weatherData.temperature }}°C</span>
            <span class="weather-divider">·</span>
            <span class="weather-desc">{{ weatherData.weather }}</span>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
/* 欢迎卡片 - 紧凑样式 */
.welcome-card {
  margin-bottom: 16px;
}

.welcome-card :deep(.ant-card-body) {
  padding: 12px 16px;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-wrapper :deep(.ant-avatar) {
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.avatar-wrapper:hover :deep(.ant-avatar) {
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.avatar-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890ff 0%, #36cfc9 50%, #52c41a 100%);
  z-index: -1;
  opacity: 0.6;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.03);
    opacity: 0.4;
  }
}

.welcome-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.welcome-text :deep(.ant-typography) {
  margin-bottom: 0;
}

.welcome-text :deep(h4) {
  font-size: 16px;
  font-weight: 500;
}

.welcome-text :deep(.ant-typography-secondary) {
  font-size: 12px;
}

.weather-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weather-icon {
  font-size: 24px;
  color: #faad14;
}

.weather-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.city-name {
  font-size: 13px;
  font-weight: 500;
  color: #262626;
}

.temp-weather-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #8c8c8c;
}

.weather-desc {
  font-size: 11px;
  color: #8c8c8c;
}

.temp-value {
  color: #8c8c8c;
}

.weather-divider {
  color: #8c8c8c;
}

.weather-desc {
  color: #8c8c8c;
}
</style>
