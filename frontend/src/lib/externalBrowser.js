import { Browser } from "@capacitor/browser";

async function openExternalUrl(url) {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) {
    return;
  }

  try {
    await Browser.open({
      url: normalizedUrl,
      windowName: "_blank",
      toolbarColor: "#18181b",
    });
  } catch {
    if (typeof window !== "undefined") {
      window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    }
  }
}

export { openExternalUrl };
