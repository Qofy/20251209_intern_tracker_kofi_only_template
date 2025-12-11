<script>
  import { getContext } from 'svelte';
  
  export let value;
  
  const { selectValue } = getContext('select');
</script>

<div
  class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
  on:click={() => selectValue(value)}
  on:keydown={(e) => e.key === 'Enter' && selectValue(value)}
  role="option"
  tabindex="0"
>
  <slot />
</div>
