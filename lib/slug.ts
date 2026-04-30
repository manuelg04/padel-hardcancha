export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeGalleryUrls(value: string) {
  return value
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean);
}
