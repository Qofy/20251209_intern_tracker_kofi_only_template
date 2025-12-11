<script>
  import { getContext } from 'svelte';
  
  export let className = '';
  
  const { open } = getContext('select');
</script>

{#if $open}
  <div class="absolute top-full left-0 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md {className}">
    <slot />
  </div>
{/if}
