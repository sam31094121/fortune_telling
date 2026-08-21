export type CityEntry = {
  id: string;
  name: string;
  country: string;
  aliases: string[];
  latitude: number;
  longitude: number;
  timezone: string;
};

export const CITY_DIRECTORY: CityEntry[] = [
  { id: 'taipei', name: '台北', country: '台灣', aliases: ['台北市', 'Taipei'], latitude: 25.033, longitude: 121.5654, timezone: 'Asia/Taipei' },
  { id: 'new-taipei', name: '新北', country: '台灣', aliases: ['新北市', 'New Taipei'], latitude: 25.0169, longitude: 121.4628, timezone: 'Asia/Taipei' },
  { id: 'taoyuan', name: '桃園', country: '台灣', aliases: ['桃園市', 'Taoyuan'], latitude: 24.9936, longitude: 121.301, timezone: 'Asia/Taipei' },
  { id: 'hsinchu', name: '新竹', country: '台灣', aliases: ['新竹市', 'Hsinchu'], latitude: 24.8138, longitude: 120.9675, timezone: 'Asia/Taipei' },
  { id: 'taichung', name: '台中', country: '台灣', aliases: ['台中市', 'Taichung'], latitude: 24.1477, longitude: 120.6736, timezone: 'Asia/Taipei' },
  { id: 'chiayi', name: '嘉義', country: '台灣', aliases: ['嘉義市', 'Chiayi'], latitude: 23.4801, longitude: 120.4491, timezone: 'Asia/Taipei' },
  { id: 'tainan', name: '台南', country: '台灣', aliases: ['台南市', 'Tainan'], latitude: 22.9997, longitude: 120.2270, timezone: 'Asia/Taipei' },
  { id: 'kaohsiung', name: '高雄', country: '台灣', aliases: ['高雄市', 'Kaohsiung'], latitude: 22.6273, longitude: 120.3014, timezone: 'Asia/Taipei' },
  { id: 'pingtung', name: '屏東', country: '台灣', aliases: ['屏東市', 'Pingtung'], latitude: 22.6813, longitude: 120.4879, timezone: 'Asia/Taipei' },
  { id: 'yilan', name: '宜蘭', country: '台灣', aliases: ['宜蘭市', 'Yilan'], latitude: 24.7021, longitude: 121.7378, timezone: 'Asia/Taipei' },
  { id: 'hualien', name: '花蓮', country: '台灣', aliases: ['花蓮市', 'Hualien'], latitude: 23.9769, longitude: 121.6044, timezone: 'Asia/Taipei' },
  { id: 'taitung', name: '台東', country: '台灣', aliases: ['台東市', 'Taitung'], latitude: 22.7583, longitude: 121.1444, timezone: 'Asia/Taipei' },
  { id: 'keelung', name: '基隆', country: '台灣', aliases: ['基隆市', 'Keelung'], latitude: 25.1276, longitude: 121.7392, timezone: 'Asia/Taipei' },
  { id: 'changhua', name: '彰化', country: '台灣', aliases: ['彰化市', 'Changhua'], latitude: 24.0518, longitude: 120.5161, timezone: 'Asia/Taipei' },
  { id: 'nantou', name: '南投', country: '台灣', aliases: ['南投市', 'Nantou'], latitude: 23.9157, longitude: 120.6869, timezone: 'Asia/Taipei' },
  { id: 'yunlin', name: '雲林', country: '台灣', aliases: ['雲林縣', 'Yunlin'], latitude: 23.7092, longitude: 120.4313, timezone: 'Asia/Taipei' },
  { id: 'miaoli', name: '苗栗', country: '台灣', aliases: ['苗栗市', 'Miaoli'], latitude: 24.5602, longitude: 120.8214, timezone: 'Asia/Taipei' },
  { id: 'kinmen', name: '金門', country: '台灣', aliases: ['金門縣', 'Kinmen'], latitude: 24.4324, longitude: 118.3171, timezone: 'Asia/Taipei' },
  { id: 'penghu', name: '澎湖', country: '台灣', aliases: ['澎湖縣', 'Penghu'], latitude: 23.5711, longitude: 119.5793, timezone: 'Asia/Taipei' },
  { id: 'hong-kong', name: '香港', country: '香港', aliases: ['Hong Kong', 'HK'], latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong' },
  { id: 'macau', name: '澳門', country: '澳門', aliases: ['Macau'], latitude: 22.1987, longitude: 113.5439, timezone: 'Asia/Macau' },
  { id: 'tokyo', name: '東京', country: '日本', aliases: ['Tokyo'], latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'osaka', name: '大阪', country: '日本', aliases: ['Osaka'], latitude: 34.6937, longitude: 135.5023, timezone: 'Asia/Tokyo' },
  { id: 'seoul', name: '首爾', country: '韓國', aliases: ['Seoul'], latitude: 37.5665, longitude: 126.9780, timezone: 'Asia/Seoul' },
  { id: 'beijing', name: '北京', country: '中國', aliases: ['Beijing'], latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { id: 'shanghai', name: '上海', country: '中國', aliases: ['Shanghai'], latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { id: 'guangzhou', name: '廣州', country: '中國', aliases: ['Guangzhou'], latitude: 23.1291, longitude: 113.2644, timezone: 'Asia/Shanghai' },
  { id: 'shenzhen', name: '深圳', country: '中國', aliases: ['Shenzhen'], latitude: 22.5431, longitude: 114.0579, timezone: 'Asia/Shanghai' },
  { id: 'singapore', name: '新加坡', country: '新加坡', aliases: ['Singapore'], latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
  { id: 'kuala-lumpur', name: '吉隆坡', country: '馬來西亞', aliases: ['Kuala Lumpur', 'KL'], latitude: 3.1390, longitude: 101.6869, timezone: 'Asia/Kuala_Lumpur' },
  { id: 'bangkok', name: '曼谷', country: '泰國', aliases: ['Bangkok'], latitude: 13.7563, longitude: 100.5018, timezone: 'Asia/Bangkok' },
  { id: 'manila', name: '馬尼拉', country: '菲律賓', aliases: ['Manila'], latitude: 14.5995, longitude: 120.9842, timezone: 'Asia/Manila' },
  { id: 'jakarta', name: '雅加達', country: '印尼', aliases: ['Jakarta'], latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta' },
  { id: 'ho-chi-minh', name: '胡志明市', country: '越南', aliases: ['Ho Chi Minh City', 'Saigon'], latitude: 10.8231, longitude: 106.6297, timezone: 'Asia/Ho_Chi_Minh' },
  { id: 'sydney', name: '雪梨', country: '澳洲', aliases: ['Sydney'], latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { id: 'melbourne', name: '墨爾本', country: '澳洲', aliases: ['Melbourne'], latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
  { id: 'auckland', name: '奧克蘭', country: '紐西蘭', aliases: ['Auckland'], latitude: -36.8485, longitude: 174.7633, timezone: 'Pacific/Auckland' },
  { id: 'london', name: '倫敦', country: '英國', aliases: ['London'], latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { id: 'paris', name: '巴黎', country: '法國', aliases: ['Paris'], latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { id: 'berlin', name: '柏林', country: '德國', aliases: ['Berlin'], latitude: 52.5200, longitude: 13.4050, timezone: 'Europe/Berlin' },
  { id: 'amsterdam', name: '阿姆斯特丹', country: '荷蘭', aliases: ['Amsterdam'], latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam' },
  { id: 'dubai', name: '杜拜', country: '阿聯', aliases: ['Dubai'], latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { id: 'new-york', name: '紐約', country: '美國', aliases: ['New York', 'NYC'], latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { id: 'los-angeles', name: '洛杉磯', country: '美國', aliases: ['Los Angeles', 'LA'], latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
  { id: 'san-francisco', name: '舊金山', country: '美國', aliases: ['San Francisco', 'SF'], latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles' },
  { id: 'chicago', name: '芝加哥', country: '美國', aliases: ['Chicago'], latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' },
  { id: 'seattle', name: '西雅圖', country: '美國', aliases: ['Seattle'], latitude: 47.6062, longitude: -122.3321, timezone: 'America/Los_Angeles' },
  { id: 'toronto', name: '多倫多', country: '加拿大', aliases: ['Toronto'], latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { id: 'vancouver', name: '溫哥華', country: '加拿大', aliases: ['Vancouver'], latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver' },
];

const DEFAULT_CITY_ID = 'taipei';

export function getDefaultCity(): CityEntry {
  const city = CITY_DIRECTORY.find((item) => item.id === DEFAULT_CITY_ID);
  if (!city) throw new Error('城市清單缺少預設城市設定。');
  return city;
}

export function findCityById(id: string): CityEntry | null {
  return CITY_DIRECTORY.find((item) => item.id === id) ?? null;
}

export function searchCities(query: string, limit = 12): CityEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return CITY_DIRECTORY.slice(0, limit);
  return CITY_DIRECTORY
    .filter((city) => {
      const haystack = [city.name, city.country, ...city.aliases].join(' ').toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, limit);
}
