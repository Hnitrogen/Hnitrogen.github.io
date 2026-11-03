// Approved local artwork and the user's coastal-road reference. See design/landscape/.
export const LANDSCAPES = [
  { id: 'alpine-drive', label: '雪山湖畔', width: 1536 },
  { id: 'forest-road', label: '林间晨雾', width: 1536 },
  { id: 'coast', label: '沿海公路', width: 1920 },
].map((scene) => ({
  ...scene,
  src: `images/landscapes/${scene.id}.webp`,
  mobile: `images/landscapes/${scene.id}-mobile.webp`,
  cover: `images/landscapes/${scene.id}-cover.webp`,
  thumbnail: `images/landscapes/${scene.id}-thumb.webp`,
}));
