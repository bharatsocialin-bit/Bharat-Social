import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function main() {
  const zai = await ZAI.create();
  const prompt = `Epic comic book illustration banner, biblical heroes ensemble on the right side: young shepherd David holding a sling, bearded prophet Moses holding glowing stone tablets, wise king with golden crown, ancient Middle Eastern robes in royal purple crimson and gold, dramatic stormy sky in deep violet purple magenta and burning gold sunset, divine light rays breaking through clouds, ancient stone city of Jerusalem silhouette in far background, bold ink outlines, vibrant comic book colors, cinematic wide composition, characters positioned on right half, left half fades into dark navy purple gradient with soft glow, no text, no letters, no words, high quality detailed comic art`;
  const response = await zai.images.generations.create({ prompt, size: '1536x704' });
  const b64 = response.data[0].base64;
  if (!b64) throw new Error('No image data returned');
  fs.writeFileSync('/home/z/my-project/public/comics/hero-banner.png', Buffer.from(b64, 'base64'));
  console.log('Saved hero-banner.png');
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
