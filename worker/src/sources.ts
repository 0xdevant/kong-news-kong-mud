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

/** Liber Research (WordPress) — mostly HK research; extend keys if RSS adds new slugs */
const LIBER_MAP: Record<string, NewsCategory> = {
  土地供應: "本地",
  市區重建: "本地",
  房屋研究: "本地",
  北部都會區: "本地",
  土地及房屋研究: "本地",
  土地規劃基建: "本地",
  規劃研究: "本地",
  丁屋研究: "本地",
  濕地研究: "本地",
  專題研究: "本地",
  簡約公屋: "本地",
  社區研究: "本地",
  社區空間研究: "本地",
  環境保育研究: "本地",
  生態旅遊: "本地",
  郊野公園: "本地",
  古蹟保育研究: "本地",
  數據研究: "本地",
  數據百用: "本地",
  研究資訊: "本地",
  檔案研究: "本地",
  鄉郊: "本地",
  商店空置: "本地",
  解鎖研究: "本地",
  探熱專題: "本地",
  "土地、規劃及基建研究": "本地",
  香港: "本地",
  香港郊野: "本地",
  旅行: "國際",
  旅游: "國際",
  傳媒報導: "時事",
  "In the press": "時事",
  精選: "其他",
  小紅書: "其他",
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
  {
    name: "本土研究社 Liber Research",
    urls: ["https://liber-research.com/feed/"],
    categoryMap: LIBER_MAP,
    defaultCategory: "其他",
    wordpressFeaturedFallback: true,
  },
  {
    name: "獨立媒體",
    urls: ["https://www.inmediahk.net/rss.xml"],
    categoryMap: {},
    defaultCategory: "時事",
    inmediaPathCategory: true,
  },
];
