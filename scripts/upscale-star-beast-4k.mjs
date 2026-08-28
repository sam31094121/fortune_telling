import sharp from 'sharp';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/upscale-star-beast-4k.mjs <input> <output>');
}

await sharp(inputPath)
  .resize(2160, 3840, {
    fit: 'fill',
    kernel: sharp.kernel.lanczos3,
  })
  .sharpen({ sigma: 0.55, m1: 0.45, m2: 0.2 })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outputPath);

const metadata = await sharp(outputPath).metadata();
if (metadata.width !== 2160 || metadata.height !== 3840) {
  throw new Error(`Unexpected output size: ${metadata.width}x${metadata.height}`);
}

console.log(`${metadata.width}x${metadata.height}`);
