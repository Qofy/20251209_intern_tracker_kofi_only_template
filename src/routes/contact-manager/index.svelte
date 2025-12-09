<script>
  import { onMount } from 'svelte';
  import { ContractTemplate } from '../../entities/all';
  import Button from '../../lib/components/ui/button/button.svelte';
  import Input from '../../lib/components/ui/input/input.svelte';
  import Textarea from '../../lib/components/ui/textarea/textarea.svelte';
  import { Plus, Edit, Trash2, BookOpen, Save, GripVertical, Eye, Download, HelpCircle } from 'lucide-svelte';
  import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
  import { initialContractParagraphs } from '../../lib/components/contracts/initialContractData';

  let templates = [];
  let selectedTemplate = null;
  let isLoading = false;
  let title = '';
  let description = '';
  let paragraphs = [];
  let showPreview = false;
  let showGuide = false;

  onMount(() => {
    loadTemplates();
  });

  $: if (selectedTemplate) {
    title = selectedTemplate.title;
    description = selectedTemplate.description;
    paragraphs = selectedTemplate.paragraphs || [];
  } else {
    title = '';
    description = '';
    paragraphs = [];
  }

  async function loadTemplates() {
    isLoading = true;
    try {
      const data = await ContractTemplate.list();
      templates = data;
    } catch (error) {
      console.error("Error loading templates:", error);
    }
    isLoading = false;
  }

  function handleSelectTemplate(template) {
    selectedTemplate = template;
  }

  function handleNewTemplate() {
    selectedTemplate = null;
    title = 'New Contract Template';
    description = 'A new contract template ready for editing.';
    paragraphs = JSON.parse(JSON.stringify(initialContractParagraphs));
  }

  async function handleSaveTemplate() {
    if (!title) {
      alert('Template title is required.');
      return;
    }

    try {
      const data = { title, description, paragraphs };
      if (selectedTemplate?.id) {
        await ContractTemplate.update(selectedTemplate.id, data);
      } else {
        await ContractTemplate.create(data);
      }
      loadTemplates();
      alert('Template saved successfully!');
    } catch (error) {
      console.error("Error saving template:", error);
      alert('Error saving template. Please try again.');
    }
  }

  async function handleDeleteTemplate(id) {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await ContractTemplate.delete(id);
        if (selectedTemplate?.id === id) {
          selectedTemplate = null;
        }
        loadTemplates();
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const items = Array.from(paragraphs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    paragraphs = items;
  }

  function updateParagraph(index, updatedParagraph) {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = updatedParagraph;
    paragraphs = newParagraphs;
  }

  function addNewParagraph() {
    const newParagraph = {
      id: Math.random().toString(36).substr(2, 9),
      title_de: "§ Neue Bestimmung",
      title_en: "§ New Provision",
      content_de: "Inhalt hier eingeben...",
      content_en: "Enter content here..."
    };
    paragraphs = [...paragraphs, newParagraph];
  }

  function deleteParagraph(index) {
    if (window.confirm('Are you sure you want to delete this paragraph?')) {
      const newParagraphs = paragraphs.filter((_, i) => i !== index);
      paragraphs = newParagraphs;
    }
  }
</script>

<div class="p-8 flex gap-8">
  <!-- Sidebar -->
  <aside class="w-1/3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-white">Contract Templates</h2>
      <Button on:click={handleNewTemplate} size="sm" class="bg-emerald-500 hover:bg-emerald-600 text-white">
        <Plus class="w-4 h-4 mr-2" /> New
      </Button>
    </div>

    {#if isLoading}
      <div class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
        <p class="text-white/60">Loading templates...</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each templates as template}
          <div
            class={`p-4 rounded-lg cursor-pointer transition-colors ${
              selectedTemplate?.id === template.id ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'
            }`}
            on:click={() => handleSelectTemplate(template)}
          >
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-bold text-white">{template.title}</h4>
                <p class="text-sm text-white/70">{template.description}</p>
                <p class="text-xs text-white/50 mt-1">{template.paragraphs?.length || 0} paragraphs</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="text-red-400 hover:text-red-300"
                on:click={(e) => {
                  e.stopPropagation();
                  handleDeleteTemplate(template.id);
                }}
              >
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>
          </div>
        {/each}

        {#if templates.length === 0}
          <div class="text-center py-8">
            <BookOpen class="w-12 h-12 mx-auto text-white/30 mb-4" />
            <p class="text-white/60">No templates found</p>
            <Button
              on:click={handleNewTemplate}
              class="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus class="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </aside>

  <!-- Main Editor -->
  <main class="w-2/3">
    {#if title}
      <div class="bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
        <div class="space-y-4 mb-6 pb-6 border-b border-white/10">
          <div>
            <label class="text-sm font-medium text-white/80 mb-1 block">Template Title</label>
            <Input
              bind:value={title}
              class="bg-white/10 border-white/20 text-white text-lg font-bold"
              placeholder="Contract template name..."
            />
          </div>
          <div>
            <label class="text-sm font-medium text-white/80 mb-1 block">Description</label>
            <Input
              bind:value={description}
              class="bg-white/10 border-white/20 text-white"
              placeholder="When to use this template..."
            />
          </div>
          <div class="flex gap-3">
            <Button on:click={handleSaveTemplate} class="bg-blue-500 hover:bg-blue-600 text-white">
              <Save class="w-4 h-4 mr-2" /> Save Template
            </Button>
            <Button on:click={() => showPreview = true} variant="outline" class="text-white border-white/20 hover:bg-white/10">
              <Eye class="w-4 h-4 mr-2" /> Preview Contract
            </Button>
            <Button on:click={addNewParagraph} variant="ghost" class="text-white hover:bg-white/10">
              <Plus class="w-4 h-4 mr-2" /> Add Paragraph
            </Button>
            <Button on:click={() => showGuide = true} variant="ghost" size="icon" class="text-white/70 hover:text-white hover:bg-white/10">
              <HelpCircle class="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-xl font-bold text-white mb-4">Contract Paragraphs</h3>
          <p class="text-white/70 text-sm mb-6">
            Use placeholders like student_name, start_date, mentor_name to make templates dynamic.
          </p>

          <div class="space-y-4">
            {#each paragraphs as paragraph, index (paragraph.id)}
              <div class="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-400/30">
                    <span class="text-amber-300 font-bold text-sm">§{index + 1}</span>
                  </div>
                  <h4 class="text-lg font-bold text-white">Paragraph {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    on:click={() => deleteParagraph(index)}
                    class="ml-auto text-red-400 hover:text-red-300"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm font-medium text-white/80 mb-1 block">Title (German)</label>
                    <Input
                      bind:value={paragraph.title_de}
                      on:blur={() => updateParagraph(index, paragraph)}
                      class="bg-white/10 border-white/20 text-white"
                      placeholder="German title..."
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-white/80 mb-1 block">Title (English)</label>
                    <Input
                      bind:value={paragraph.title_en}
                      on:blur={() => updateParagraph(index, paragraph)}
                      class="bg-white/10 border-white/20 text-white"
                      placeholder="English title..."
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm font-medium text-white/80 mb-1 block">Content (German)</label>
                    <Textarea
                      bind:value={paragraph.content_de}
                      on:blur={() => updateParagraph(index, paragraph)}
                      class="bg-white/10 border-white/20 text-white min-h-[150px]"
                      placeholder="German content with placeholders..."
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-white/80 mb-1 block">Content (English)</label>
                    <Textarea
                      bind:value={paragraph.content_en}
                      on:blur={() => updateParagraph(index, paragraph)}
                      class="bg-white/10 border-white/20 text-white min-h-[150px]"
                      placeholder="English content with placeholders..."
                    />
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center h-full bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
        <div class="text-center">
          <BookOpen class="w-16 h-16 mx-auto text-white/30 mb-4" />
          <h3 class="text-xl font-bold text-white">Select a template to edit or create a new one.</h3>
          <p class="text-white/60 mt-2">Contract templates allow you to generate personalized contracts for students.</p>
        </div>
      </div>
    {/if}
  </main>
</div>
