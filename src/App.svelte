<script lang="ts">
  import BlurLogo from "./assets/blur-logo.svg";
  import AddImageLogo from "./assets/add-image.svg";
  import { processImage, BlurRadius } from "./lib/photo-editor";
  import Loader from "./components/Loader.svelte";

  /**
   * Uploaded files (should only contain one file)
   */
  let files: FileList;

  /**
   * State to toggle loading animation.
   */
  let loadingState: boolean = false;

  /**
   * Object URLs for uploaded and processed images.
   * Either both links are present or neither are present.
   */
  let imageUrls:
    | { uploaded: string; processed: string }
    | { uploaded: null; processed: null } = {
    uploaded: null,
    processed: null,
  };

  /**
   * Reference to anchor for downloading image.
   */
  let downloadElement: HTMLAnchorElement;

  /**
   * Name of the downloaded file.
   * It is updated when new file is uploaded.
   */
  let downloadFilename: string | null = null;

  /**
   * Blur applied to the image.
   */
  let blurRadius: number = BlurRadius.Default;

  /**
   * Previously applied blur value.
   * Use this as a reference to avoid triggering redundant processing.
   */
  let prevBlur: number = blurRadius;

  /**
   * Upload a new image and apply effects.
   */
  const uploadImage = async () => {
    // Remove existing image objects
    if (imageUrls.processed) {
      URL.revokeObjectURL(imageUrls.processed);
      URL.revokeObjectURL(imageUrls.uploaded);
      imageUrls = { uploaded: null, processed: null };
    }

    if (files.length === 1) {
      loadingState = true;
      const file = files.item(0) as File;
      downloadFilename = `bordered-${file.name}`;
      let uploadedImageUrl: string | null = URL.createObjectURL(file);
      let processedImageUrl: string | null = await processImage(
        uploadedImageUrl,
        blurRadius,
        true,
      );

      if (processedImageUrl === null) {
        // Failed to process image
        URL.revokeObjectURL(uploadedImageUrl);
        imageUrls = {
          uploaded: null,
          processed: null,
        };
      } else {
        imageUrls = {
          uploaded: uploadedImageUrl,
          processed: processedImageUrl,
        };
      }

      loadingState = false;
    }
  };

  /**
   * Update the blur amount on the border.
   */
  const changeBlur = async () => {
    if (!imageUrls.uploaded || prevBlur === blurRadius) return;

    loadingState = true;

    prevBlur = blurRadius;
    const prevImg = imageUrls.processed;
    let processedImageUrl = await processImage(imageUrls.uploaded, blurRadius);
    // Delete old object after generating new one, otherwise it causes a flash while replacing elements.
    URL.revokeObjectURL(prevImg);

    if (processedImageUrl === null) {
      // Failed to process image
      URL.revokeObjectURL(imageUrls.uploaded);
      imageUrls = { uploaded: null, processed: null };
    } else imageUrls = { ...imageUrls, processed: processedImageUrl };

    loadingState = false;
  };

  /**
   * Generate full resolution image and start download.
   */
  const triggerDownload = async () => {
    try {
      loadingState = true;

      // Add a false delay to allow loadingState UI update
      setTimeout(async () => {
        if (!imageUrls.uploaded) {
          loadingState = false;
          return;
        }

        downloadElement.href =
          (await processImage(imageUrls.uploaded, blurRadius, false, true)) ??
          "/#";

        loadingState = false;
        if (downloadElement.href === "/#") return;
        downloadElement.click();

        // Ensure file is downloaded before deleting object
        setTimeout(() => {
          URL.revokeObjectURL(downloadElement.href);
          downloadElement.href = "/#";
        }, 2000);
      }, 0);
    } catch (error) {
      console.error(error);
    }
  };

  $: if (files) uploadImage();
</script>

<main>
  <div class="relative h-screen w-screen">
    {#if loadingState}
      <Loader />
    {/if}

    <header
      class="sticky top-0 flex h-12 w-full justify-between bg-neutral-900 px-4 py-2 text-white"
    >
      <!-- Title -->
      <h1 class="font-title text-2xl font-semibold">
        <span class="text-pink-600">Minsta</span>Fit
      </h1>
      <div class="flex items-stretch font-mono">
        <!-- Upload button -->
        <label
          for="uploadImage"
          class={(imageUrls.processed ? "rounded-l-md" : "rounded-md") +
            " mr-0 cursor-pointer bg-pink-600 px-2 py-1 duration-200 ease-in-out hover:bg-pink-500 active:bg-pink-950"}
        >
          Upload
        </label>

        <!-- Download button -->
        {#if imageUrls.processed}
          <button
            on:click={triggerDownload}
            class="ml-0 rounded-r-md bg-neutral-200 px-2 py-1 text-black duration-200 ease-in-out hover:bg-neutral-50 active:bg-neutral-400"
          >
            Download
          </button>
          <a
            bind:this={downloadElement}
            download={downloadFilename}
            href="/#"
            hidden
          >
          </a>
        {/if}

        <input
          type="file"
          accept="image/png, image/jpeg"
          id="uploadImage"
          bind:files
          class="hidden"
        />
      </div>
    </header>

    <!-- Image view -->
    <section
      class="flex h-[calc(100vh-3rem-3.5rem)] w-full items-center justify-center bg-neutral-800 px-2 py-2"
    >
      {#if !imageUrls.processed}
        <label
          for="uploadImage"
          class="flex h-full w-full cursor-pointer items-center justify-center"
        >
          <img src={AddImageLogo} alt="Upload" class="h-20 w-20" />
        </label>
      {:else}
        <img src={imageUrls.processed} alt="Processed" class="max-h-full" />
      {/if}
    </section>

    <!-- Customization toolbar -->
    <footer
      class="sticky bottom-0 h-14 w-full bg-neutral-900 px-4 py-2 text-white"
    >
      {#if !imageUrls.uploaded}
        <div
          class="flex h-full w-full items-center justify-center font-mono text-sm text-neutral-400 sm:text-sm"
        >
          Upload image for customization options
        </div>
      {:else}
        <!-- Blur setting -->
        <div class="flex items-center space-x-5">
          <button>
            <img
              src={BlurLogo}
              alt="Blur"
              class="h-7 w-7 cursor-pointer transition-transform ease-in-out hover:scale-125"
            />
          </button>

          <input
            type="range"
            min={BlurRadius.Min}
            max={BlurRadius.Max}
            bind:value={blurRadius}
            on:change={changeBlur}
            class="h-2 grow cursor-pointer rounded-lg accent-pink-600"
          />

          <input
            type="number"
            min={BlurRadius.Min}
            max={BlurRadius.Max}
            bind:value={blurRadius}
            on:change={changeBlur}
            class="w-10 border-b-4 border-pink-600 bg-neutral-900 px-1 py-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      {/if}
    </footer>
  </div>
</main>
