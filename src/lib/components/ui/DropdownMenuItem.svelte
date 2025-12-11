<script>
  export let onSelect = null;
  export let className = '';
</script>

<div
  class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground {className}"
  on:click={onSelect}
  on:keydown={(e) => e.key === 'Enter' && onSelect?.(e)}
  role="menuitem"
  tabindex="0"
>
  <slot />
</div>
