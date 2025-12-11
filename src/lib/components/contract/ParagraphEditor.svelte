<script>
  import Input from '$lib/components/ui/input.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';

  export let paragraph;
  export let onUpdate;
  export let index;

  let localParagraph = { ...paragraph };

  function handleChange(field, value) {
    localParagraph = { ...localParagraph, [field]: value };
  }

  function handleBlur() {
    onUpdate(index, localParagraph);
  }
</script>

<div class="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
  <div class="flex items-center gap-3 mb-4">
    <div class="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-400/30">
      <span class="text-amber-300 font-bold text-sm">§{index + 1}</span>
    </div>
    <h4 class="text-lg font-bold text-white">Paragraph {index + 1}</h4>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="text-sm font-medium text-white/80 mb-1 block">Title (German)</label>
      <Input
        value={localParagraph.title_de || ''}
        on:input={(e) => handleChange('title_de', e.target.value)}
        on:blur={handleBlur}
        class="bg-white/10 border-white/20 text-white"
        placeholder="German title..."
      />
    </div>
    <div>
      <label class="text-sm font-medium text-white/80 mb-1 block">Title (English)</label>
      <Input
        value={localParagraph.title_en || ''}
        on:input={(e) => handleChange('title_en', e.target.value)}
        on:blur={handleBlur}
        class="bg-white/10 border-white/20 text-white"
        placeholder="English title..."
      />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="text-sm font-medium text-white/80 mb-1 block">Content (German)</label>
      <Textarea
        value={localParagraph.content_de || ''}
        on:input={(e) => handleChange('content_de', e.target.value)}
        on:blur={handleBlur}
        class="bg-white/10 border-white/20 text-white min-h-[150px]"
        placeholder="German content with placeholders..."
      />
    </div>
    <div>
      <label class="text-sm font-medium text-white/80 mb-1 block">Content (English)</label>
      <Textarea
        value={localParagraph.content_en || ''}
        on:input={(e) => handleChange('content_en', e.target.value)}
        on:blur={handleBlur}
        class="bg-white/10 border-white/20 text-white min-h-[150px]"
        placeholder="English content with placeholders..."
      />
    </div>
  </div>
</div>
