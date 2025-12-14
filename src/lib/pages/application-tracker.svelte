<script>
  import { onMount } from 'svelte';
  import { Application } from '../../entities/all';
  import { userStore, isAdmin, isMentor } from '../../stores/userStore';
  import Button from '../components/ui/button.svelte';
  import Input from '../components/ui/input.svelte';
  import Textarea from '../components/ui/textarea.svelte';
  import Badge from '../components/ui/badget.svelte';
  import Select from '../components/ui/select.svelte';
  import SelectTrigger from '../components/ui/SelectTrigger.svelte';
  import SelectValue from '../components/ui/SelectValue.svelte';
  import SelectContent from '../components/ui/SelectContent.svelte';
  import SelectItem from '../components/ui/SelectItem.svelte';
  import { FileText, Upload, Eye, Check, X, Plus, Edit, CheckCircle2, AlertCircle } from 'lucide-svelte';
  import { UploadFile } from '$lib/integrations/Core';

  $: user = $userStore.user;

  const documentTypes = [
    { key: 'passport', label: 'Passport', required: true },
    { key: 'permit_to_stay', label: 'Permit to Stay', required: true },
    { key: 'student_id', label: 'Student ID', required: true },
    { key: 'university_form', label: 'University Internship Form', required: true },
    { key: 'signed_contract', label: 'Signed Contract', required: true },
    { key: 'anmeldung', label: 'Anmeldung', required: true },
    { key: 'confirmation_letter', label: 'Letter of Confirmation as Student', required: true },
    { key: 'visa', label: 'VISA / Work Permit', required: false }
  ];

  let applications = [];
  let showForm = false;
  let editingApplication = null;
  let statusFilter = 'all';
  let isUploading = false;
  let uploadingDoc = null;

  let formData = {
    student_data: {
      full_name: '',
      address: '',
      phone_number: ''
    },
    documents: {}
  };

  onMount(() => {
    loadApplications();
  });

  $: if (statusFilter) {
    loadApplications();
  }

  async function loadApplications() {
    try {
      let filter = {};
      if (statusFilter !== 'all') {
        filter.status = statusFilter;
      }
      const apps = await Application.filter(filter);
      applications = apps;
    } catch (error) {
      console.error("Error loading applications:", error);
    }
  }

  async function handleSave() {
    try {
      const data = {
        ...formData,
        applicant_email: user.email
      };

      if (editingApplication) {
        await Application.update(editingApplication.id, data);
      } else {
        await Application.create(data);
      }

      loadApplications();
      showForm = false;
      editingApplication = null;
      resetForm();
    } catch (error) {
      console.error("Error saving application:", error);
    }
  }

  async function handleStatusChange(applicationId, newStatus) {
    try {
      await Application.update(applicationId, { status: newStatus });
      loadApplications();
    } catch (error) {
      console.error("Error updating application status:", error);
    }
  }

  async function handleFileUpload(docType, file) {
    isUploading = true;
    uploadingDoc = docType;
    try {
      const { file_url } = await UploadFile({ file });
      formData = {
        ...formData,
        documents: {
          ...formData.documents,
          [docType]: file_url
        }
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please try again.");
    }
    isUploading = false;
    uploadingDoc = null;
  }

  function resetForm() {
    formData = {
      student_data: {
        full_name: '',
        address: '',
        phone_number: ''
      },
      documents: {}
    };
  }

  function getStatusBadge(status) {
    const configs = {
      draft: { color: 'bg-gray-500/20 text-gray-300 border-gray-400/30', label: 'Draft' },
      submitted: { color: 'bg-blue-500/20 text-blue-300 border-blue-400/30', label: 'Submitted' },
      viewed: { color: 'bg-amber-500/20 text-amber-300 border-amber-400/30', label: 'Under Review' },
      approved: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30', label: 'Approved' },
      rejected: { color: 'bg-red-500/20 text-red-300 border-red-400/30', label: 'Rejected' }
    };
    const config = configs[status] || configs.draft;
    return config;
  }

  $: missingRequired = documentTypes
    .filter(doc => doc.required && !formData.documents[doc.key])
    .map(doc => doc.label);

  function getCompletionRate() {
    const requiredDocs = documentTypes.filter(doc => doc.required);
    const uploadedRequired = requiredDocs.filter(doc => formData.documents[doc.key]);
    return Math.round((uploadedRequired.length / requiredDocs.length) * 100);
  }
</script>

<div class="p-8">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <FileText class="w-8 h-8 text-blue-400" />
        Application Tracker
      </h1>
      <p class="text-white/70">Manage internship applications and document requirements</p>
    </div>

    <div class="flex items-center gap-4">
      <Select bind:value={statusFilter}>
        <SelectTrigger class="w-48 bg-white/10 border-white/20 text-white">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Applications</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="submitted">Submitted</SelectItem>
          <SelectItem value="viewed">Under Review</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {#if !$isAdmin && !$isMentor}
        <Button
          on:click={() => { editingApplication = null; showForm = true; resetForm(); }}
          class="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Plus class="w-5 h-5 mr-2" />
          New Application
        </Button>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-1 gap-6">
    {#each applications as app}
      {@const statusBadge = getStatusBadge(app.status)}
      <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-xl font-bold text-white">{app.student_data?.full_name || 'Unnamed Application'}</h3>
            <p class="text-white/60">{app.applicant_email}</p>
          </div>
          <div class="flex items-center gap-3">
            <Badge class={statusBadge.color}>{statusBadge.label}</Badge>
            {#if ($isAdmin || $isMentor) && app.status === 'submitted'}
              <div class="flex gap-2">
                <Button
                  size="sm"
                  on:click={() => handleStatusChange(app.id, 'approved')}
                  class="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Check class="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  on:click={() => handleStatusChange(app.id, 'rejected')}
                  class="bg-red-500 hover:bg-red-600 text-white"
                >
                  <X class="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            {/if}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-semibold text-white mb-3">Personal Information</h4>
            <div class="space-y-2 text-sm">
              <p class="text-white/80">Address: <span class="text-white">{app.student_data?.address || 'Not provided'}</span></p>
              <p class="text-white/80">Phone: <span class="text-white">{app.student_data?.phone_number || 'Not provided'}</span></p>
            </div>
          </div>

          <div>
            <h4 class="font-semibold text-white mb-3">Document Status</h4>
            <div class="grid grid-cols-2 gap-2">
              {#each documentTypes.slice(0, 4) as doc}
                <div class="flex items-center gap-2">
                  {#if app.documents?.[doc.key]}
                    <CheckCircle2 class="w-4 h-4 text-emerald-400" />
                  {:else}
                    <X class="w-4 h-4 text-red-400" />
                  {/if}
                  <span class="text-white/70 text-xs">{doc.label}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          {#if app.applicant_email === user?.email && app.status === 'draft'}
            <Button
              on:click={() => { editingApplication = app; formData = app; showForm = true; }}
              variant="outline"
              class="text-white border-white/20 hover:bg-white/10"
            >
              <Edit class="w-4 h-4 mr-2" /> Edit
            </Button>
          {/if}
          <Button
            on:click={() => alert('View application details')}
            class="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Eye class="w-4 h-4 mr-2" /> View Details
          </Button>
        </div>
      </div>
    {/each}

    {#if applications.length === 0}
      <div class="text-center py-12">
        <FileText class="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-white mb-2">No Applications Found</h3>
        <p class="text-white/60 mb-6">
          {statusFilter === 'all' ? 'No applications have been submitted yet.' : `No applications with status "${statusFilter}".`}
        </p>
        {#if !$isAdmin && !$isMentor}
          <Button
            on:click={() => { editingApplication = null; showForm = true; resetForm(); }}
            class="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus class="w-5 h-5 mr-2" />
            Start Your Application
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  {#if showForm}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
      <div class="max-w-4xl w-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold text-white">Internship Application</h2>
          <div class="flex items-center gap-3">
            <span class="text-white/70">Completion:</span>
            <span class="text-amber-400 font-bold">{getCompletionRate()}%</span>
          </div>
        </div>

        <!-- Form content (simplified for brevity) -->
        <div class="mb-8">
          <h3 class="text-xl font-bold text-white mb-4">Personal Information</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label class="text-white/80 mb-2 block">Full Name</Label>
              <Input
                bind:value={formData.student_data.full_name}
                class="bg-white/10 border-white/20 text-white"
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label class="text-white/80 mb-2 block">Phone Number</Label>
              <Input
                bind:value={formData.student_data.phone_number}
                class="bg-white/10 border-white/20 text-white"
                placeholder="Your phone number"
              />
            </div>
          </div>
          <div class="mt-4">
            <Label class="text-white/80 mb-2 block">Address</Label>
            <Textarea
              bind:value={formData.student_data.address}
              class="bg-white/10 border-white/20 text-white"
              placeholder="Your full address"
            />
          </div>
        </div>

        <!-- Document Uploads -->
        <div class="mb-8">
          <h3 class="text-xl font-bold text-white mb-4">Required Documents</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each documentTypes as docType}
              {@const isUploaded = !!formData.documents[docType.key]}
              <div class="bg-white/5 rounded-xl border border-white/10 p-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-white font-medium">{docType.label}</span>
                    {#if docType.required}
                      <Badge class="bg-red-500/20 text-red-300 border-red-400/30 text-xs">
                        Required
                      </Badge>
                    {/if}
                  </div>
                  {#if isUploaded}
                    <CheckCircle2 class="w-5 h-5 text-emerald-400" />
                  {:else}
                    <AlertCircle class="w-5 h-5 text-red-400" />
                  {/if}
                </div>

                {#if isUploaded}
                  <div class="flex items-center gap-3">
                    <a
                      href={formData.documents[docType.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex-1 text-emerald-400 hover:text-emerald-300 text-sm"
                    >
                      ✓ View uploaded file
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      on:click={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx';
                        input.onchange = (e) => {
                          if (e.target.files.length > 0) {
                            handleFileUpload(docType.key, e.target.files[0]);
                          }
                        };
                        input.click();
                      }}
                      class="text-blue-400 hover:bg-blue-500/20"
                      disabled={uploadingDoc === docType.key}
                    >
                      Replace
                    </Button>
                  </div>
                {:else}
                  <Button
                    variant="outline"
                    size="sm"
                    on:click={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx';
                      input.onchange = (e) => {
                        if (e.target.files.length > 0) {
                          handleFileUpload(docType.key, e.target.files[0]);
                        }
                      };
                      input.click();
                    }}
                    class="w-full text-white border-white/20 hover:bg-white/10"
                    disabled={uploadingDoc === docType.key}
                  >
                    {#if uploadingDoc === docType.key}
                      <div class="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full mr-2"></div>
                      Uploading...
                    {:else}
                      <Upload class="w-4 h-4 mr-2" />
                      Upload {docType.label}
                    {/if}
                  </Button>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="flex justify-end gap-4">
          <Button
            variant="ghost"
            on:click={() => { showForm = false; resetForm(); }}
            class="text-white/80 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            on:click={handleSave}
            class="bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={!formData.student_data.full_name}
          >
            {editingApplication ? 'Update Application' : 'Save Application'}
          </Button>
        </div>

        <!-- Warnings -->
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
      </div>
    </div>
  {/if}
</div>
