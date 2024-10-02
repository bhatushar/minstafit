import { Jimp } from "jimp";

/**
 * Range of accepted blur radius
 */
export enum BlurRadius {
  Min = 1,
  Max = 100,
  Default = 50,
}

/**
 * Type representing dimension of an image
 */
interface Dimension {
  width: number;
  height: number;
}

/**
 * Pixel coordinate on an image
 */
interface Coordinate {
  x: number;
  y: number;
}

/*
 * These are Jimp instanes but since Jimp doesn't export a proper type,
 * these have to be defined as any.
 */
let origImg: any, fgImg: any, bgImg: any;

/**
 * Get dimension such that it meets Instagram's accepted ratio.
 *
 * Instagram accepted ratio rules:
 * 1. Image should be at least 1080px wide
 * 2. Aspect ratio should be between 1.91:1 and 4:5
 * With a width of 1080px, image can be between 565.31px and 1350px tall.
 * Image 1080r px wide => Expected height range [566r, 1350r] px
 * @see {@link https://help.instagram.com/1631821640426723|Instagram ratio rules}
 *
 * The function doesn't excatly work like that.
 * It returns dimensions to expand the image while maintaining the
 * current aspect ratio. The reason for this because we crop the image
 * to fit the correct ratio after stacking the images.
 *
 * @param width - Image width in px
 * @param height - Image height in px
 * @returns Expanded dimension
 */
const expandToMinBorder = (width: number, height: number): Dimension => {
  const lenFactor = width / 1080;
  const heightMin = 566 * lenFactor;
  const heightMax = 1350 * lenFactor;

  if (height < heightMin) {
    // Image is too wide. Increase height with border.
    // (heightMin - height) is the minimum amount of border needed.
    const hDelta = heightMin - height;
    const wDelta = hDelta * (width / height); // Increase width while maintaining aspect ratio
    return { width: width + wDelta, height: height + hDelta };
  } else if (height > heightMax) {
    // Image is too tall. Increase width with border.
    // (height - heightMax) is the excess height, without it we'll meet IG ratio.
    // hDelta * imgRatio is the minimum border needed.
    const hDelta = height - heightMax;
    const wDelta = hDelta * (width / height); // Increase width while maintaining aspect ratio
    return { width: width + wDelta, height: height + hDelta };
  }
  // else image dimension already fits in IG ratio
  return { width, height };
};

/**
 * Get starting offset of fg image such that it fits in the center of bg image.
 *
 * @param fg - Foreground image dimension
 * @param bg - background image dimension
 * @returns Offset for fg
 */
const getCenterOffset = (fg: Dimension, bg: Dimension): Coordinate => {
  return { x: (bg.width - fg.width) / 2, y: (bg.height - fg.height) / 2 };
};

/**
 * Add minimum amount of blurred border to source image to meet IG ratio criteria.
 * By default, it compresses the image to 1080px wide while maintaining the original ratio.
 *
 * @example Apply blur to new image
 * ```ts
 * let url = await processImage(imgObjectUrl, 50, true);
 * ```
 *
 * @example Update blur on existing image
 * ```ts
 * let url = await processImage(imageObjectUrl, 75);
 * ```
 *
 * @example Get full resolution image
 * ```ts
 * let url = await processImage(imageObjectUrl, 25, false, true);
 * ```
 *
 * @param imageUrl - Source image URL
 * @param blurRadius - Blur amount between { BlurRadius.Min } and { BlurRadius.Max }
 * @param newImage - Discard existing image object and create new one, if true
 * @param useFullRes - Process on full resolution image
 * @returns Object URL of processed image
 */
export const processImage = async (
  imageUrl: string,
  blurRadius: number,
  newImage: boolean = false,
  useFullRes: boolean = false,
): Promise<string | null> => {
  if (blurRadius < BlurRadius.Min || BlurRadius.Max < blurRadius) {
    console.error(`Blur radius out of bounds: ${blurRadius}`);
    return null;
  }
  try {
    if (newImage) origImg = await Jimp.read(imageUrl);
    if (newImage || useFullRes) fgImg = origImg.clone();
    if (!useFullRes) fgImg.resize({ w: 1080 });
    bgImg = fgImg.clone();

    // Blur backgound image
    bgImg.blur(blurRadius);

    // Expand image to minimum border requirement
    const expanded = expandToMinBorder(fgImg.width, fgImg.height);
    bgImg.resize({ w: expanded.width, h: expanded.height });

    // Stack foreground in the center of background
    const offset = getCenterOffset(
      { width: fgImg.width, height: fgImg.height },
      { width: bgImg.width, height: bgImg.height },
    );
    bgImg.composite(fgImg, offset.x, offset.y);

    // Crop to IG ratio
    if (fgImg.width > fgImg.height) {
      // Landscape photo - remove vertical border
      bgImg.crop({
        x: offset.x,
        y: 0,
        w: fgImg.width,
        h: bgImg.height,
      });
    } else {
      // Portrait photo - remove horizontal border
      bgImg.crop({
        x: 0,
        y: offset.y,
        w: bgImg.width,
        h: fgImg.height,
      });
    }

    // Write image
    const imageBlob = new Blob([await bgImg.getBuffer("image/jpeg")]);
    return URL.createObjectURL(imageBlob);
  } catch (error) {
    console.error(error);
    return null;
  }
};
