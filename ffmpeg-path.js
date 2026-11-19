// Mencari ffmpeg yang benar-benar bisa jalan: env FFMPEG_PATH -> ffmpeg-static -> @ffmpeg-installer -> ffmpeg di PATH sistem.
const { spawnSync } = require('child_process');
let cached;
const works = p => { try { return !!p && spawnSync(p, ['-version'], { timeout: 20000, windowsHide: true }).status === 0; } catch { return false; } };
module.exports = function findFfmpeg() {
  if (cached !== undefined) return cached;
  const c = [];
  if (process.env.FFMPEG_PATH) c.push(process.env.FFMPEG_PATH);
  try { c.push(require('ffmpeg-static')); } catch {}
  try { c.push(require('@ffmpeg-installer/ffmpeg').path); } catch {}
  c.push('ffmpeg');
  return (cached = c.find(works) || null);
};
