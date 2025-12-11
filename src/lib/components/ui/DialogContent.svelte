<script>
  export let open = false;
  export let onOpenChange;
  export let className = '';
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black/50" 
      on:click={() => onOpenChange(false)}
      on:keydown={(e) => e.key === 'Escape' && onOpenChange(false)}
      role="button"
      tabindex="-1"
    />
    <!-- Dialog -->
    <div class="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 {className}">
      <slot />
    </div>
  </div>
{/if}
