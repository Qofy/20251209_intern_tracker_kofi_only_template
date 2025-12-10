<script>
  export let variant = 'default';
  export let size = 'default';
  export let disabled = false;
  export let type = 'button';

  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    default: 'bg-purple-600 text-white hover:bg-purple-700',
    ghost: 'hover:bg-gray-100 hover:text-gray-900',
    outline: 'border border-gray-300 hover:bg-gray-100 hover:text-gray-900',
  };

  const sizes = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md text-sm',
    lg: 'h-11 px-8 rounded-md text-lg',
  };

  $: classes = `${baseClasses} ${variants[variant]} ${sizes[size]}`;
</script>

<button
  {type}
  {disabled}
  class={classes}
  on:click
  {...$$restProps}
>
  <slot />
</button>
