<script>
  import { onMount } from 'svelte';
  import { StudentDocument } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import Button from '../../lib/components/ui/button/button.svelte';
  import Input from '../../lib/components/ui/input/input.svelte';
  import Label from '../../lib/components/ui/label/label.svelte';
  import Textarea from '../../lib/components/ui/textarea/textarea.svelte';
  import { UploadFile } from '../../integrations/Core';
  import { FileArchive, Upload, Trash2, Download } from 'lucide-svelte';

  $: user = $userStore.user;

  let documents = [];
  let isUploading = false;
  let newDocument = {
    document_type: '',
    description: '',
    file: null,
  };

  onMount(() => {
    if (user) {
      loadDocuments();
    }
  });

  $: if (user) {
    loadDocuments();
  }

  async function loadDocuments() {
    const docs = await StudentDocument.filter({ student_email: user.email });
    documents = docs;
  }

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      newDocument.file = e.target.files[0];
    }
  }

  async function handleUpload() {
    if (!newDocument.file || !newDocument.document_type) {
      alert("Please select a file and document type.");
      return;
    }
    isUploading = true;
    try {
      const { file_url } = await UploadFile({ file: newDocument.file });
      await StudentDocument.create({
        student_email: user.email,
        document_type: newDocument.document_type,
        description: newDocument.description,
        file_url: file_url,
      });
      newDocument = { document_type: '', description: '', file: null };
      loadDocuments();
    } catch (error) {
      console.error("Failed to upload document:", error);
    }
    isUploading = false;
  }

  async function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this document?")) {
      await StudentDocument.delete(id);
      loadDocuments();
    }
  }
</script>

<div class="p-8">
  <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
    <FileArchive class="w-8 h-8 text-cyan-400" />
    My Documents
  </h1>
  <p class="text-white/70 mb-8">Upload and manage your personal documents.</p>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1">
      <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
        <h3 class="text-xl font-bold text-white mb-4">Upload New Document</h3>
        <div class="space-y-4">
          <div>
            <Label class="text-white/80 mb-2 block">Document Type</Label>
            <select bind:value={newDocument.document_type} class="w-full bg-white/10 border-white/20 text-white rounded-md p-2">
              <option value="">Select type...</option>
              <option value="id">ID / Passport</option>
              <option value="contract">Signed Contract</option>
              <option value="visa">Visa / Work Permit</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label class="text-white/80 mb-2 block">Description</Label>
            <Textarea bind:value={newDocument.description} placeholder="Optional description" class="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label class="text-white/80 mb-2 block">File</Label>
            <Input type="file" on:change={handleFileChange} class="bg-white/10 border-white/20 text-white file:text-white/70" />
          </div>
          <Button on:click={handleUpload} disabled={isUploading} class="w-full bg-emerald-500 hover:bg-emerald-600">
            <Upload class="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>

    <div class="lg:col-span-2">
      <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
        <h3 class="text-xl font-bold text-white mb-4">Uploaded Documents</h3>
        <div class="space-y-3">
          {#if documents.length > 0}
            {#each documents as doc (doc.id)}
              <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p class="text-white font-medium capitalize">{doc.document_type}</p>
                  <p class="text-white/60 text-sm">{doc.description || 'No description'}</p>
                </div>
                <div class="flex items-center gap-2">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" class="text-blue-400 hover:text-blue-300">
                      <Download class="w-4 h-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" class="text-red-400 hover:text-red-300" on:click={() => handleDelete(doc.id)}>
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            {/each}
          {:else}
            <p class="text-white/60 text-center py-8">No documents uploaded yet.</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
