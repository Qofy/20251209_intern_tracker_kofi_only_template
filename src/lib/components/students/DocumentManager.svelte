<script>
  import { onMount } from 'svelte';
  import { StudentDocument } from '../../../entities/all';
  import { UploadFile } from '$lib/integrations/Core';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Select from '$lib/components/ui/select.svelte';
  import SelectTrigger from '$lib/components/ui/SelectTrigger.svelte';
  import SelectValue from '$lib/components/ui/SelectValue.svelte';
  import SelectContent from '$lib/components/ui/SelectContent.svelte';
  import SelectItem from '$lib/components/ui/SelectItem.svelte';
  import { Upload, Eye, Trash2, X } from 'lucide-svelte';
  import RequirementsChecker from './RequirementsChecker.svelte';

  export let student;
  export let onClose;

  let documents = [];
  let isUploading = false;
  let newDocument = {
    document_type: '',
    description: '',
    file: null,
  };

  onMount(() => {
    loadDocuments();
  });

  async function loadDocuments() {
    if (student?.student_email) {
      const docs = await StudentDocument.list({ student_email: student.student_email });
      documents = docs;
    }
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
        student_email: student.student_email,
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

<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <div class="bg-white/10 backdrop-blur-md border border-white/20 text-white max-w-6xl w-full max-h-[80vh] overflow-y-auto rounded-2xl">
    <div class="p-6 border-b border-white/10">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Document Management - {student.full_name}</h2>
          <p class="text-white/70 text-sm mt-1">Manage documents for this student with requirements checking</p>
        </div>
        <Button variant="ghost" size="icon" on:click={onClose} class="text-white/60 hover:text-white">
          <X class="w-5 h-5" />
        </Button>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Requirements Checker -->
      <RequirementsChecker {student} />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Upload Form -->
        <div class="lg:col-span-1">
          <h3 class="text-lg font-bold text-white mb-4">Upload New Document</h3>
          <div class="space-y-4">
            <div>
              <label class="text-white/80 mb-2 block text-sm font-medium">Document Type</label>
              <Select bind:value={newDocument.document_type}>
                <SelectTrigger class="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="permit_to_stay">Permit to Stay</SelectItem>
                  <SelectItem value="student_id">Student ID</SelectItem>
                  <SelectItem value="university_form">University Form</SelectItem>
                  <SelectItem value="signed_contract">Signed Contract</SelectItem>
                  <SelectItem value="anmeldung">Anmeldung</SelectItem>
                  <SelectItem value="confirmation_letter">Confirmation Letter</SelectItem>
                  <SelectItem value="visa">VISA / Work Permit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label class="text-white/80 mb-2 block text-sm font-medium">Description</label>
              <Textarea
                bind:value={newDocument.description}
                placeholder="Document description"
                class="bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            <div>
              <label class="text-white/80 mb-2 block text-sm font-medium">File</label>
              <Input
                type="file"
                on:change={handleFileChange}
                class="bg-white/10 border-white/20 text-white file:text-white/70"
              />
            </div>
            <Button on:click={handleUpload} disabled={isUploading} class="w-full bg-emerald-500 hover:bg-emerald-600">
              <Upload class="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </div>

        <!-- Documents List -->
        <div class="lg:col-span-2">
          <h3 class="text-lg font-bold text-white mb-4">Uploaded Documents</h3>
          <div class="space-y-3">
            {#if documents.length > 0}
              {#each documents as doc}
                <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <p class="text-white font-medium capitalize">{doc.document_type.replace('_', ' ')}</p>
                    <p class="text-white/60 text-sm">{doc.description || 'No description'}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" class="text-blue-400 hover:text-blue-300">
                        <Eye class="w-4 h-4" />
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
</div>
