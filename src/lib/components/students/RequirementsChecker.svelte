<script>
  import { onMount } from 'svelte';
  import { StudentDocument } from '$lib/entities/all';
  import { CheckCircle2, AlertCircle } from 'lucide-svelte';
  import Badge from '$lib/components/ui/badget.svelte';

  export let student;

  const requiredDocuments = [
    { key: 'passport', label: 'Passport', required: true },
    { key: 'permit_to_stay', label: 'Permit to Stay', required: true },
    { key: 'student_id', label: 'Student ID', required: true },
    { key: 'university_form', label: 'University Internship Form', required: true },
    { key: 'signed_contract', label: 'Signed Contract', required: true },
    { key: 'anmeldung', label: 'Anmeldung', required: true },
    { key: 'confirmation_letter', label: 'Letter of Confirmation as Student', required: true },
    { key: 'visa', label: 'VISA / Work Permit', required: false }
  ];

  let documents = [];
  let isLoading = true;
  let completionRate = 0;

  $: if (documents.length >= 0) {
    calculateCompletionRate();
  }

  $: missingRequired = getMissingRequiredDocuments();

  function calculateCompletionRate() {
    const requiredDocs = requiredDocuments.filter(doc => doc.required);
    const uploadedRequired = requiredDocs.filter(doc =>
      documents.some(uploaded => uploaded.document_type === doc.key)
    );
    completionRate = Math.round((uploadedRequired.length / requiredDocs.length) * 100);
  }

  async function loadDocuments() {
    isLoading = true;
    try {
      const docs = await StudentDocument.filter({
        student_email: student.student_email || student.email
      });
      documents = docs;
    } catch (error) {
      console.error("Error loading documents:", error);
    }
    isLoading = false;
  }

  function isDocumentUploaded(docKey) {
    return documents.some(doc => doc.document_type === docKey);
  }

  function getCompletionColor() {
    if (completionRate === 100) return 'text-emerald-400';
    if (completionRate >= 70) return 'text-amber-400';
    return 'text-red-400';
  }

  function getMissingRequiredDocuments() {
    return requiredDocuments
      .filter(doc => doc.required && !isDocumentUploaded(doc.key))
      .map(doc => doc.label);
  }

  onMount(() => {
    if (student) {
      loadDocuments();
    }
  });

  $: if (student) {
    loadDocuments();
  }
</script>

<div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
  <div class="flex items-center justify-between mb-6">
    <h3 class="text-xl font-bold text-white">Document Requirements</h3>
    <div class="flex items-center gap-3">
      <span class={`text-2xl font-bold ${getCompletionColor()}`}>
        {completionRate}%
      </span>
      <div class="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          class={`h-full transition-all duration-500 ${
            completionRate === 100 ? 'bg-emerald-500' :
            completionRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style="width: {completionRate}%"
        />
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="text-center py-8">
      <div class="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
      <p class="text-white/60">Checking documents...</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each requiredDocuments as doc}
        {@const isUploaded = isDocumentUploaded(doc.key)}
        <div
          class={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
            isUploaded
              ? 'bg-emerald-500/10 border-emerald-400/30'
              : doc.required
                ? 'bg-red-500/10 border-red-400/30'
                : 'bg-white/5 border-white/10'
          }`}
        >
          <div class="flex items-center gap-3">
            {#if isUploaded}
              <CheckCircle2 class="w-5 h-5 text-emerald-400" />
            {:else}
              <AlertCircle class="w-5 h-5 text-red-400" />
            {/if}
            <span class="text-white font-medium">{doc.label}</span>
            {#if doc.required}
              <Badge className="bg-red-500/20 text-red-300 border-red-400/30 text-xs">
                Required
              </Badge>
            {/if}
          </div>

          <div class="text-sm">
            {#if isUploaded}
              <span class="text-emerald-400 font-medium">✓ Uploaded</span>
            {:else}
              <span class="text-red-400">Missing</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if missingRequired.length > 0}
    <div class="mt-6 p-4 bg-red-500/20 rounded-xl border border-red-400/30">
      <h4 class="text-red-300 font-medium mb-2">Missing Required Documents:</h4>
      <ul class="text-red-300 text-sm space-y-1">
        {#each missingRequired as doc}
          <li>• {doc}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if completionRate === 100}
    <div class="mt-6 p-4 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
      <div class="flex items-center gap-2">
        <CheckCircle2 class="w-5 h-5 text-emerald-400" />
        <span class="text-emerald-300 font-medium">All requirements completed!</span>
      </div>
      <p class="text-emerald-300/80 text-sm mt-1">
        Student is ready for contract generation.
      </p>
    </div>
  {/if}
</div>
