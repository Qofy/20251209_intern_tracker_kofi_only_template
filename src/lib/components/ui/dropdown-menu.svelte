<script>
  import { onMount, onDestroy } from 'svelte';
  
  export let open = false;
  export let onOpenChange = null;
  
  let dropdownRef;
  
  function handleClickOutside(event) {
    if (dropdownRef && !dropdownRef.contains(event.target)) {
      open = false;
      if (onOpenChange) onOpenChange(false);
    }
  }
  
  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });
  
  onDestroy(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });
  
  $: if (onOpenChange && open !== undefined) {
    onOpenChange(open);
  }
</script>

<div class="relative" bind:this={dropdownRef}>
  <slot {open} onOpenChange={(value) => open = value} />
</div>
