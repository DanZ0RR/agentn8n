const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

// Resize settings
const INPUT_DIR = path.join(__dirname, '..', 'assets', 'agents');
const OUTPUT_DIR = path.join(INPUT_DIR, 'resized');
const SIZE = 64;

if (!fs.existsSync(INPUT_DIR)) {
  console.error('Input directory does not exist:', INPUT_DIR);
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const patterns = ['*.png', '*.jpg', '*.jpeg', '*.webp'];

(async () => {
  try {
    for (const pattern of patterns) {
      const files = glob.sync(path.join(INPUT_DIR, pattern));
      for (const file of files) {
        const fileName = path.basename(file);
        const outPath = path.join(OUTPUT_DIR, fileName);
        console.log(`Resizing ${fileName} -> ${outPath}`);
        await sharp(file)
          .resize(SIZE, SIZE, { fit: 'cover' })
          .toFile(outPath);
      }
    }
    console.log('Done resizing images. Resized files are in', OUTPUT_DIR);
  } catch (err) {
    console.error('Error resizing images:', err);
    process.exit(1);
  }
})();
