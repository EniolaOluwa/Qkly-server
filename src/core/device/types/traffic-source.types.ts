export enum TrafficSource {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
  SNAPCHAT = 'snapchat',
  BING = 'bing',
  YOUTUBE = 'youtube',
  CHATGPT = 'chatgpt',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  GROK = 'grok',
  DIRECT = 'direct',
  OTHER = 'other'
}


export const SOURCE_PATTERNS: Record<TrafficSource, string[]> = {
  [TrafficSource.GOOGLE]: [
    'google.', 'googlesyndication', 'googleadservices'
  ],
  [TrafficSource.FACEBOOK]: [
    'facebook.com', 'fb.com', 'fb.me', 'm.facebook.com'
  ],
  [TrafficSource.INSTAGRAM]: [
    'instagram.com'
  ],
  [TrafficSource.WHATSAPP]: [
    'whatsapp.com', 'wa.me'
  ],
  [TrafficSource.TIKTOK]: [
    'tiktok.com', 'tiktokv.com'
  ],
  [TrafficSource.TWITTER]: [
    'twitter.com', 't.co', 'x.com'
  ],
  [TrafficSource.SNAPCHAT]: [
    'snapchat.com'
  ],
  [TrafficSource.BING]: [
    'bing.com'
  ],
  [TrafficSource.YOUTUBE]: [
    'youtube.com', 'youtu.be'
  ],
  [TrafficSource.CHATGPT]: [
    'chat.openai.com', 'chatgpt.com'
  ],
  [TrafficSource.CLAUDE]: [
    'claude.ai'
  ],
  [TrafficSource.GEMINI]: [
    'gemini.google.com'
  ],
  [TrafficSource.GROK]: [
    'grok.x.ai'
  ],
  [TrafficSource.DIRECT]: [],
  [TrafficSource.OTHER]: []
};
