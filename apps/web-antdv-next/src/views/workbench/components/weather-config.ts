/**
 * 天气代码映射配置
 * 基于 Open-Meteo 天气代码对照表
 * @author inspur-iep-ai
 */

export interface WeatherCodeMapItem {
  /** 天气代码 */
  code: number | number[];
  /** 天气描述（中文） */
  desc: string;
  /** 图标文件名（不含扩展名） */
  icon: string;
}

/**
 * 天气代码映射表
 */
export const WEATHER_CODE_MAP: WeatherCodeMapItem[] = [
  { code: 0, desc: '晴天', icon: '0,1' },
  { code: 1, desc: '主要晴天', icon: '0,1' },
  { code: 2, desc: '局部多云', icon: '2' },
  { code: 3, desc: '阴天', icon: '3' },
  { code: 45, desc: '雾', icon: '45' },
  { code: 48, desc: '雾凇雾', icon: '48' },
  { code: [51, 53, 55], desc: '毛毛雨', icon: '51,53,55' },
  { code: [56, 57], desc: '冻毛毛雨', icon: '56,57' },
  { code: [61, 63, 65], desc: '雨', icon: '61' },
  { code: [66, 67], desc: '冻雨', icon: '66,67' },
  { code: [71, 73, 75], desc: '雪', icon: '71' },
  { code: 77, desc: '雪粒', icon: '77' },
  { code: [80, 81, 82], desc: '阵雨', icon: '80,81,82' },
  { code: [85, 86], desc: '阵雪', icon: '85,86' },
  { code: 95, desc: '雷暴', icon: '95' },
  { code: [96, 99], desc: '雷暴伴有冰雹', icon: '96,99' },
];

/**
 * 根据天气代码获取天气信息
 * @param weatherCode 天气代码
 * @returns 天气描述和图标
 */
export function getWeatherInfo(
  weatherCode: number | string,
): WeatherCodeMapItem {
  const code = Number(weatherCode);

  const weather = WEATHER_CODE_MAP.find((item) => {
    if (Array.isArray(item.code)) {
      return item.code.includes(code);
    }
    return item.code === code;
  });
  if (weather) {
    return weather;
  }

  // 默认返回阴天
  return { code: 3, desc: '阴天', icon: '3' };
}

/**
 * 解析温度字符串，提取数值
 * @param temperature 温度字符串，如 "21.6°C"
 * @returns 数值，如 21.6
 */
export function parseTemperature(temperature: string): number {
  const match = temperature.match(/[\d.]+/);
  return match ? Number.parseFloat(match[0]) : 0;
}

/**
 * 获取天气图标路径
 * @param weatherCode 天气代码
 * @returns SVG 图标路径
 */
export function getWeatherIconPath(weatherCode: number | string): string {
  const weather = getWeatherInfo(weatherCode);
  // 对图标文件名中的逗号进行 URL 编码，避免路径解析问题
  const encodedIcon = encodeURIComponent(weather.icon);
  // 使用相对路径引用 svg 目录下的图标
  return `./svg/${encodedIcon}.svg`;
}
