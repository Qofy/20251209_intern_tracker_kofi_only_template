<script context="module">
  import { writable } from 'svelte/store';
  
  // Shared store for dialog state
  export const dialogOpen = writable(false);
</script>

<script>
  export let open = false;
  export let onOpenChange = null;

  $: if (onOpenChange) {
    onOpenChange(open);
  }
</script>

<slot {open} onOpenChange={(value) => open = value} />
