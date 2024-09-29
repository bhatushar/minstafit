<script lang="ts">
  import { processImage, BlurRadius } from "./lib/photo-editor";
  import Loader from "./components/Loader.svelte";

  let files: FileList;
  let uploadedImageUrl: string | null;
  let processedImageUrl: string | null = null;
  let imageName: string | null = null;
  let loadingState: boolean = false;
  let blurRadius: number = BlurRadius.Default;

  const uploadImage = async () => {
    if (processedImageUrl) {
      URL.revokeObjectURL(processedImageUrl);
      URL.revokeObjectURL(uploadedImageUrl as string); // If processed image exists, uploaded also exists
      uploadedImageUrl = processedImageUrl = null;
    }
    if (files.length === 1) {
      loadingState = true;
      const file = files.item(0) as File;
      imageName = `bordered-${file.name}`;
      uploadedImageUrl = URL.createObjectURL(file);
      processedImageUrl = await processImage(
        uploadedImageUrl,
        BlurRadius.Default,
      );
      if (processedImageUrl === null) {
        // Failed to process image
        URL.revokeObjectURL(uploadedImageUrl as string);
        uploadedImageUrl = null;
      }
      loadingState = false;
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
      class="sticky top-0 flex h-12 w-full justify-between bg-neutral-900 px-4 py-2 text-white">
      <!-- Title -->
      <h1 class="font-title text-2xl font-semibold">
        <span class="text-pink-600">Minsta</span>Fit
      </h1>
      <div class="flex items-stretch font-mono">
        <!-- Upload button -->
        <label
          for="uploadImage"
          class={(processedImageUrl !== null ? "rounded-l-md" : "rounded-md") +
            " mr-0 cursor-pointer bg-pink-600 px-2 py-1 duration-200 ease-in-out hover:bg-pink-500 active:bg-pink-950"}>
          Upload
        </label>

        <!-- Download button -->
        {#if processedImageUrl !== null}
          <a
            href={processedImageUrl}
            download={imageName}
            class="ml-0 rounded-r-md bg-neutral-200 px-2 py-1 text-black duration-200 ease-in-out hover:bg-neutral-50 active:bg-neutral-400">
            Download
          </a>
        {/if}

        <input
          type="file"
          accept="image/png, image/jpeg"
          id="uploadImage"
          bind:files
          class="hidden" />
      </div>
    </header>

    <!-- Image view -->
    <section
      class="flex h-[calc(100vh-3rem-3.5rem)] w-full items-center justify-center bg-neutral-800 px-2 py-2">
      {#if processedImageUrl !== null}
        <img src={processedImageUrl} alt="Processed" class="max-h-full" />
      {/if}
    </section>

    <!-- Customization toolbar -->
    <footer
      class="sticky bottom-0 h-14 w-full bg-neutral-900 px-4 py-2 text-white">
      <div class="flex items-center space-x-5">
        <input
          type="range"
          min={BlurRadius.Min}
          max={BlurRadius.Max}
          bind:value={blurRadius}
          class="h-2 grow cursor-pointer rounded-lg accent-pink-600" />
        <input
          type="number"
          min={BlurRadius.Min}
          max={BlurRadius.Max}
          bind:value={blurRadius}
          class="w-10 border-b-4 border-pink-600 bg-neutral-900 px-1 py-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      </div>
    </footer>
  </div>
</main>
