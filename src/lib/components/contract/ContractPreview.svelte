<script>
  import Dialog from '$lib/components/ui/dialog.svelte';
  import DialogContent from '$lib/components/ui/DialogContent.svelte';
  import DialogHeader from '$lib/components/ui/DialogHeader.svelte';
  import DialogTitle from '$lib/components/ui/DialogTitle.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { Download } from 'lucide-svelte';

  export let template;
  export let onClose;

  const sampleData = {
    student_name: "Max Mustermann",
    start_date: "01.01.2024",
    end_date: "31.12.2024",
    mentor_name: "Dr. Smith",
    work_area: "Software Development",
    work_description: "Web development, database management, testing",
    weekly_hours: "40",
    probation_weeks: "4",
    probation_months: "1",
    company_name: "Tech Solutions GmbH",
    company_address: "Musterstr. 123, 12345 Musterstadt",
  };

  let open = true;

  function handleOpenChange(isOpen) {
    if (!isOpen) {
      onClose();
    }
  }

  function replacePlaceholders(text) {
    if (!text) return '';
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] || match);
  }

  function handlePrint() {
    window.print();
  }
</script>

<svelte:head>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
    }
    @page { size: A4; margin: 2cm; }
  </style>
</svelte:head>

<Dialog bind:open on:openChange={(e) => handleOpenChange(e.detail)}>
  <DialogContent class="bg-white text-black max-w-6xl max-h-[90vh] overflow-y-auto">
    <DialogHeader class="no-print">
      <DialogTitle class="text-black">Contract Preview - {template.title}</DialogTitle>
    </DialogHeader>

    <div class="print-container grid grid-cols-2 gap-8 p-6 text-sm">
      <div>
        <h3 class="text-center font-bold mb-4">Pflicht-Praktikumsvertrag</h3>
        <div class="space-y-4">
          {#each template.paragraphs || [] as para, index}
            <div class="mb-6">
              <h4 class="font-bold mb-2">§ {index + 1} {replacePlaceholders(para.title_de)}</h4>
              <p class="whitespace-pre-wrap leading-relaxed">{replacePlaceholders(para.content_de)}</p>
            </div>
          {/each}
        </div>
      </div>

      <div>
        <h3 class="text-center font-bold mb-4">Compulsory Internship Contract</h3>
        <div class="space-y-4">
          {#each template.paragraphs || [] as para, index}
            <div class="mb-6">
              <h4 class="font-bold mb-2">§ {index + 1} {replacePlaceholders(para.title_en)}</h4>
              <p class="whitespace-pre-wrap leading-relaxed">{replacePlaceholders(para.content_en)}</p>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="no-print flex justify-end gap-3 p-4 border-t">
      <Button on:click={onClose} variant="outline">Close</Button>
      <Button on:click={handlePrint} class="bg-blue-600 text-white hover:bg-blue-700">
        <Download class="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  </DialogContent>
</Dialog>
