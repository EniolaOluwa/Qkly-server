import { SOURCE_PATTERNS } from "./constants/source.constant";
import { TrafficSource } from "./types/traffic-source.types";


export function detectSource(
  referrer?: string,
  fallbackFromJs?: string,
  utmSource?: string
): TrafficSource {
  const source = (utmSource || '').toLowerCase();

  if (source) {
    if (source.includes('google')) return TrafficSource.GOOGLE;
    if (source.includes('facebook')) return TrafficSource.FACEBOOK;
    if (source.includes('instagram')) return TrafficSource.INSTAGRAM;
    if (source.includes('whatsapp')) return TrafficSource.WHATSAPP;
    if (source.includes('tiktok')) return TrafficSource.TIKTOK;
    if (source.includes('twitter') || source.includes('x'))
      return TrafficSource.TWITTER;
    if (source.includes('snapchat')) return TrafficSource.SNAPCHAT;
    if (source.includes('bing')) return TrafficSource.BING;
    if (source.includes('youtube')) return TrafficSource.YOUTUBE;
    if (source.includes('chatgpt')) return TrafficSource.CHATGPT;
    if (source.includes('claude')) return TrafficSource.CLAUDE;
    if (source.includes('gemini')) return TrafficSource.GEMINI;
    if (source.includes('grok')) return TrafficSource.GROK;
  }

  const ref = (referrer || fallbackFromJs || '').toLowerCase();
  if (!ref) return TrafficSource.DIRECT;

  for (const [key, patterns] of Object.entries(SOURCE_PATTERNS)) {
    if (patterns.some((p) => ref.includes(p.toLowerCase()))) {
      return key as TrafficSource;
    }
  }

  return TrafficSource.OTHER;
}
