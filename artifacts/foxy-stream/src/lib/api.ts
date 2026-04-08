const BASE_URL = "https://movieapi.xcasper.space/api";
const BFF_BASE = "https://movieapi.xcasper.space/api/bff/stream";

export interface MovieSubject {
  subjectId: string;
  subjectType: number; // 1 = movie, 2 = tv
  title: string;
  description: string;
  releaseDate: string;
  duration: number;
  genre: string;
  cover: {
    url: string;
    width: number;
    height: number;
    thumbnail?: string;
  };
  countryName: string;
  imdbRatingValue: string;
  imdbRatingCount: number;
  subtitles: string;
  hasResource: boolean;
  trailer: {
    videoAddress: { url: string; duration: number };
    cover: { url: string };
  } | null;
  staffList: Array<{
    name: string;
    role: string;
    avatar?: { url: string };
  }>;
  detailPath: string;
  corner: string;
  stills: { url: string } | null;
  ops: string;
}

export interface Stream {
  quality: string;
  format: string;
  size: string;
  duration: number;
  proxyUrl: string;
  downloadUrl: string;
}

export interface LatestItem {
  title: string;
  url: string;
  slug: string;
  type: string;
  category: string;
  thumbnail: string;
}

// xcasper resolution map — no trailing "p"
const RES_MAP: Record<string, string> = {
  "360p": "360",
  "480p": "480",
  "720p": "720",
  "1080p": "1080",
};
const QUALITIES = ["360p", "480p", "720p", "1080p"];

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error("API returned failure");
  return json;
};

export const api = {
  getHot: async (): Promise<{ data: { movie: MovieSubject[]; tv: MovieSubject[] } }> => {
    return fetcher(`${BASE_URL}/hot`);
  },

  getTrending: async (page = 0, perPage = 18): Promise<{ data: { subjectList: MovieSubject[] } }> => {
    return fetcher(`${BASE_URL}/trending?page=${page}&perPage=${perPage}`);
  },

  getLatest: async (page = 1): Promise<{ data: LatestItem[] }> => {
    return fetcher(`${BASE_URL}/newtoxic/latest?page=${page}`);
  },

  search: async (keyword: string, page = 1, perPage = 10, subjectType?: number): Promise<{ data: { items: MovieSubject[]; pager: { hasMore: boolean; totalCount: number } } }> => {
    const params = new URLSearchParams({ keyword, page: String(page), perPage: String(perPage) });
    if (subjectType) params.set("subjectType", String(subjectType));
    return fetcher(`${BASE_URL}/search?${params}`);
  },

  getDetail: async (subjectId: string): Promise<{ data: { subject: MovieSubject } }> => {
    return fetcher(`${BASE_URL}/detail?subjectId=${subjectId}`);
  },

  getRecommend: async (subjectId: string, page = 1, perPage = 10): Promise<{ data: { subjectList: MovieSubject[] } }> => {
    return fetcher(`${BASE_URL}/recommend?subjectId=${subjectId}&page=${page}&perPage=${perPage}`);
  },

  getCaptions: async (subjectId: string, streamId: string): Promise<{ data: unknown }> => {
    return fetcher(`${BASE_URL}/captions?subjectId=${subjectId}&streamId=${streamId}`);
  },

  // bff/stream URL format:
  //   TV:    ?subjectId=...&se=S&ep=E&resolution=360&lang=En
  //   Movie: ?subjectId=...&resolution=360&lang=En  (no se/ep)
  getStreams: (subjectId: string, season?: number, episode?: number): { streams: Stream[]; streamId: null } => {
    const isTV = season != null && episode != null;
    const streams = QUALITIES.map((q) => {
      let url = `${BFF_BASE}?subjectId=${subjectId}`;
      if (isTV) url += `&se=${season}&ep=${episode}`;
      url += `&resolution=${RES_MAP[q]}&lang=En`;
      return { quality: q, format: "mp4", size: "", duration: 0, proxyUrl: url, downloadUrl: url };
    });
    return { streams, streamId: null };
  },
};

export const formatDuration = (seconds: number): string => {
  if (!seconds) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatFileSize = (bytes: string): string => {
  const n = parseInt(bytes);
  if (!n) return "";
  const gb = n / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = n / (1024 ** 2);
  return `${Math.round(mb)} MB`;
};
