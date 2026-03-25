import type { NewsCategory, SourceConfig } from "./types";

/** WordPress / RSS category strings → app buckets */
const HKCM_MAP: Record<string, NewsCategory> = {
  本地時事: "本地",
  立法會: "本地",
  區議會: "本地",
  國際議題: "國際",
  新聞: "時事",
  國際: "國際",
};

const GREENBEAN_MAP: Record<string, NewsCategory> = {
  時事: "時事",
  兩邊走走: "時事",
  英國這邊事: "國際",
  國際多Bean事: "國際",
  小島大風吹: "本地",
  數說香港: "本地",
  其他熱話: "時事",
  人物實錄: "其他",
  記香港人: "其他",
  知識生活: "其他",
  專欄: "其他",
  法律搞Bean科: "其他",
  精選推介: "時事",
};

export const HK_NEWS_FEEDS: SourceConfig[] = [
  {
    name: "香城公民媒體",
    urls: ["https://hkcitizenmedia.com/feed/"],
    categoryMap: HKCM_MAP,
    defaultCategory: "其他",
  },
  {
    name: "綠豆 Green Bean Media",
    urls: ["https://greenbean.media/feed/"],
    categoryMap: GREENBEAN_MAP,
    defaultCategory: "其他",
  },
  // 獨立媒體：請在官方確認有效 RSS 後再加入，例如部分環境使用 /rss.xml
  // {
  //   name: "獨立媒體",
  //   urls: ["https://www.inmediahk.net/rss.xml"],
  //   categoryMap: { 政經: "時事", 國際: "國際", 社區: "本地", 保育: "其他", 生活: "其他", 文藝: "其他", 體育: "其他" },
  //   defaultCategory: "其他",
  // },
];
