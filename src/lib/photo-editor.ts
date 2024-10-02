import { Jimp } from "jimp";

export enum BlurRadius {
  Min = 1,
  Max = 100,
  Default = 50,
}

interface Dimension {
  width: number;
  height: number;
}

interface Coordinate {
  x: number;
  y: number;
}

let origImg: any, bgImgMin: any, fgImgMin: any;

/**
 * Get dimension such that it meets Instagram's accepted ratio.
 *
 * Instagram accepted ratio rules:
 * 1. Image should be at least 1080px wide
 * 2. Aspect ratio should be between 1.91:1 and 4:5
 * With a width of 1080px, image can be between 565.31px and 1350px tall.
 * Image 1080r px wide => Expected height range [565.31r, 1350r] px
 *
 * The function doesn't excatly work like that.
 * It returns dimensions to expand the image while maintaining the
 * current aspect ratio. The reason for this because we crop the image
 * to fit the correct ratio after stacking the images.
 *
 * @param {number} width - Image width in px
 * @param {number} height - Image height in px
 * @returns {Dimension} Expanded dimension
 */
const expandToMinBorder = (width: number, height: number): Dimension => {
  const lenFactor = width / 1080;
  const heightMin = 565.31 * lenFactor;
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
 * @param {Dimension} fg - Foreground image dimension
 * @param {Dimension} bg - background image dimension
 * @returns {Coordinate} Offset for fg
 */
const getCenterOffset = (fg: Dimension, bg: Dimension): Coordinate => {
  return { x: (bg.width - fg.width) / 2, y: (bg.height - fg.height) / 2 };
};

/**
 * Added blurred border to source image to meet IG ratio criteria.
 *
 * @param {string} imageUrl - Source image URL
 * @param {number} blurRadius - Blur amount between 1 and 100
 * @returns {Promise<string|null>} Processed image URL
 */
export const processImage = async (
  imageUrl: string,
  blurRadius: number,
  newImage: boolean = false,
  forDownload: boolean = false,
): Promise<string | null> => {
  if (blurRadius < BlurRadius.Min || BlurRadius.Max < blurRadius) {
    console.error(`Blur radius out of bounds: ${blurRadius}`);
    return null;
  }
  try {
    if (newImage) origImg = await Jimp.read(imageUrl);
    if (newImage || forDownload) fgImgMin = origImg.clone();
    if (!forDownload) fgImgMin.resize({ w: 1080 });
    bgImgMin = fgImgMin.clone();

    // Blur backgound image
    bgImgMin.blur(blurRadius);

    // Expand image to minimum border requirement
    const instaRatio = expandToMinBorder(fgImgMin.width, fgImgMin.height);
    bgImgMin.resize({ w: instaRatio.width, h: instaRatio.height });

    // Stack foreground in the center of background
    const offset = getCenterOffset(
      { width: fgImgMin.width, height: fgImgMin.height },
      { width: bgImgMin.width, height: bgImgMin.height },
    );
    bgImgMin.composite(fgImgMin, offset.x, offset.y);

    // Crop to IG ratio
    if (fgImgMin.width > fgImgMin.height) {
      // Landscape photo - remove vertical border
      bgImgMin.crop({
        x: offset.x,
        y: 0,
        w: fgImgMin.width,
        h: bgImgMin.height,
      });
    } else {
      // Portrait photo - remove horizontal border
      bgImgMin.crop({
        x: 0,
        y: offset.y,
        w: bgImgMin.width,
        h: fgImgMin.height,
      });
    }

    // Write image
    const imageBlob = new Blob([await bgImgMin.getBuffer("image/jpeg")]);
    return URL.createObjectURL(imageBlob);
  } catch (error) {
    console.error(error);
  }
  return null;
};
