<script>
  import { Bug, Hammer } from 'lucide-svelte';
  import Button from '$lib/components/ui/button.svelte';
  import FeedbackModal from './FeedbackModal.svelte';

  let showBugModal = false;
  let showEnhancementModal = false;
  let screenshot = null;

  async function takeScreenshot() {
    try {
      // Use html2canvas to capture screenshot
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body, {
        height: Math.max(document.body.scrollHeight, window.innerHeight),
        width: Math.max(document.body.scrollWidth, window.innerWidth),
        useCORS: true,
        allowTaint: true,
        scale: 0.5, // Reduce size for performance
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return null;
    }
  }

  async function handleBugReport() {
    const screenshotData = await takeScreenshot();
    screenshot = screenshotData;
    showBugModal = true;
  }

  async function handleEnhancementRequest() {
    const screenshotData = await takeScreenshot();
    screenshot = screenshotData;
    showEnhancementModal = true;
  }

  function getCurrentPageInfo() {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      cookies: document.cookie,
    };
  }

  function closeBugModal() {
    showBugModal = false;
    screenshot = null;
  }

  function closeEnhancementModal() {
    showEnhancementModal = false;
    screenshot = null;
  }
</script>

<!-- Floating Action Buttons -->
<div class="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
  <Button
    on:click={handleBugReport}
    size="icon"
    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
    title="Report a Bug"
  >
    <Bug class="w-6 h-6" />
  </Button>

  <Button
    on:click={handleEnhancementRequest}
    size="icon"
    className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
    title="Request Enhancement"
  >
    <Hammer class="w-6 h-6" />
  </Button>
</div>

<!-- Modals -->
{#if showBugModal}
  <FeedbackModal
    type="bug"
    {screenshot}
    pageInfo={getCurrentPageInfo()}
    onClose={closeBugModal}
  />
{/if}

{#if showEnhancementModal}
  <FeedbackModal
    type="enhancement"
    {screenshot}
    pageInfo={getCurrentPageInfo()}
    onClose={closeEnhancementModal}
  />
{/if}
