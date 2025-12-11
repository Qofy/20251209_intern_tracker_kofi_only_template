<script>
  import { onMount, onDestroy, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  
  export let value = '';
  export let onValueChange = null;
  
  let selectRef;
  const open = writable(false);
  
  setContext('select', {
    open,
    value: writable(value),
    toggle: () => open.update(v => !v),
    close: () => open.set(false),
    selectValue: (val) => {
      value = val;
      if (onValueChange) onValueChange(val);
      open.set(false);
    }
  });
  
  function handleClickOutside(event) {
    if (selectRef && !selectRef.contains(event.target)) {
      open.set(false);
    }
  }
  
  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });
  
  onDestroy(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });
  
  $: if (onValueChange && value) {
    onValueChange(value);
  }
</script>

<div class="relative" bind:this={selectRef}>
  <slot />
</div>
