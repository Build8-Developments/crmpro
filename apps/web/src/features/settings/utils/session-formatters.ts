export function formatSessionDevice(session: {
  deviceName: string | null;
  userAgent: string | null;
}): string {
  if (session.deviceName?.trim()) {
    return session.deviceName.trim();
  }

  const ua = session.userAgent ?? "";
  if (!ua) return "Unknown device";

  if (/iPhone|iPad/i.test(ua)) return "Apple device";
  if (/Android/i.test(ua)) return "Android device";
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux";

  return "Web browser";
}

export function formatSessionBrowser(userAgent: string | null): string | null {
  if (!userAgent) return null;

  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return "Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    return "Safari";
  }

  return null;
}
