<script>
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Label from '$lib/components/ui/label.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Select from '$lib/components/ui/select.svelte';
  import SelectContent from '$lib/components/ui/SelectContent.svelte';
  import SelectItem from '$lib/components/ui/SelectItem.svelte';
  import SelectTrigger from '$lib/components/ui/SelectTrigger.svelte';
  import SelectValue from '$lib/components/ui/SelectValue.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import DialogContent from '$lib/components/ui/DialogContent.svelte';
  import DialogHeader from '$lib/components/ui/DialogHeader.svelte';
  import DialogTitle from '$lib/components/ui/DialogTitle.svelte';
  import { Clock, Save, X, Upload } from 'lucide-svelte';
  import { UploadFile } from '$lib/integrations/Core';

  export let date;
  export let claim = null;
  export let onSave;
  export let onCancel;

  let formData = claim || {
    start_time: "",
    end_time: "",
    work_description: "",
    task_reference: "",
    claimed_hours: 0,
    proof_type: "",
    proof_files: [],
    break_start: "",
    break_end: "",
  };

  let isUploading = false;
  let timeError = "";
  let open = true;

  function handleInputChange(field, value) {
    formData = { ...formData, [field]: value };

    // Auto-calculate hours when times change
    if (field === 'start_time' || field === 'end_time' || field === 'break_start' || field === 'break_end') {
      const hours = calculateHours(formData);
      formData.claimed_hours = hours;

      // Validate end time
      if (formData.start_time && formData.end_time && formData.end_time <= formData.start_time) {
        timeError = "End time must be after start time";
      } else {
        timeError = "";
      }
    }
  }

  function calculateHours(data) {
    if (!data.start_time || !data.end_time) return 0;

    const start = new Date(`2000-01-01T${data.start_time}:00`);
    const end = new Date(`2000-01-01T${data.end_time}:00`);
    let totalMinutes = (end - start) / (1000 * 60);

    // Subtract break time
    if (data.break_start && data.break_end) {
      const breakStart = new Date(`2000-01-01T${data.break_start}:00`);
      const breakEnd = new Date(`2000-01-01T${data.break_end}:00`);
      const breakMinutes = (breakEnd - breakStart) / (1000 * 60);
      totalMinutes -= breakMinutes;
    }

    return Math.max(0, totalMinutes / 60);
  }

  async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    isUploading = true;
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(result => result.file_url);

      formData = {
        ...formData,
        proof_files: [...(formData.proof_files || []), ...fileUrls]
      };
    } catch (error) {
      console.error("Error uploading files:", error);
    }
    isUploading = false;
  }

  function removeFile(index) {
    formData = {
      ...formData,
      proof_files: formData.proof_files.filter((_, i) => i !== index)
    };
  }

  function handleSubmit() {
    if (!formData.start_time || !formData.work_description || timeError) {
      return;
    }
    onSave(formData);
  }

  function handleCancel() {
    open = false;
    onCancel();
  }
</script>

<Dialog {open} onOpenChange={handleCancel}>
  <DialogContent {open} onOpenChange={handleCancel}>
    <div class="bg-white/10 backdrop-blur-md border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg p-6">
      <DialogHeader>
        <DialogTitle>
          <div class="flex items-center gap-2">
            <Clock class="w-5 h-5 text-emerald-400" />
            {claim ? "Edit Hour Claim" : "Add Hour Claim"}
          </div>
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- Time Fields -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white/80 text-sm font-medium mb-2 block">Start Time *</Label>
            <Input
              type="time"
              value={formData.start_time}
              on:input={(e) => handleInputChange('start_time', e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label className="text-white/80 text-sm font-medium mb-2 block">End Time *</Label>
            <Input
              type="time"
              value={formData.end_time}
              on:input={(e) => handleInputChange('end_time', e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>
        {#if timeError}
          <p class="text-red-400 text-sm -mt-4">{timeError}</p>
        {/if}

        <!-- Break Times -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white/80 text-sm font-medium mb-2 block">Break Start</Label>
            <Input
              type="time"
              value={formData.break_start}
              on:input={(e) => handleInputChange('break_start', e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label className="text-white/80 text-sm font-medium mb-2 block">Break End</Label>
            <Input
              type="time"
              value={formData.break_end}
              on:input={(e) => handleInputChange('break_end', e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>

        <!-- Calculated Hours -->
        <div class="bg-white/5 rounded-xl p-4 border border-white/10">
          <Label className="text-white/80 text-sm font-medium mb-2 block">Calculated Hours</Label>
          <div class="text-2xl font-bold text-amber-400">
            {formData.claimed_hours.toFixed(2)} hours
          </div>
        </div>

        <!-- Work Description -->
        <div>
          <Label className="text-white/80 text-sm font-medium mb-2 block">Work Description *</Label>
          <Textarea
            bind:value={formData.work_description}
            placeholder="Describe the work you completed during this time..."
            className="bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[100px]"
          />
        </div>

        <!-- Task Reference -->
        <div>
          <Label className="text-white/80 text-sm font-medium mb-2 block">Task Reference</Label>
          <Input
            bind:value={formData.task_reference}
            placeholder="e.g., TASK #056"
            className="bg-white/10 border-white/20 text-white placeholder-white/50"
          />
        </div>

        <!-- Proof Type -->
        <div>
          <Label className="text-white/80 text-sm font-medium mb-2 block">Proof Type</Label>
          <Select
            bind:value={formData.proof_type}
            onValueChange={(value) => handleInputChange('proof_type', value)}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select proof type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="git">Git Commits</SelectItem>
              <SelectItem value="history">Work History/Screenshots</SelectItem>
              <SelectItem value="professor_proof">Professor Verification</SelectItem>
              <SelectItem value="materials">Work Materials/Files</SelectItem>
              <SelectItem value="meeting">Meeting/Call Records</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- File Upload -->
        <div>
          <Label className="text-white/80 text-sm font-medium mb-3 block">Upload Proof Files</Label>
          <div class="relative">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              on:change={handleFileUpload}
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <div class="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
              <Upload class="w-8 h-8 text-white/50 mx-auto mb-3" />
              <p class="text-white/80 font-medium">
                {isUploading ? "Uploading..." : "Click to upload proof files"}
              </p>
              <p class="text-white/50 text-sm mt-1">
                PDF, images, documents accepted
              </p>
            </div>
          </div>

          <!-- Uploaded Files -->
          {#if formData.proof_files && formData.proof_files.length > 0}
            <div class="mt-4 space-y-2">
              {#each formData.proof_files as fileUrl, index}
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <span class="text-white text-sm">Proof File {index + 1}</span>
                  <div class="flex items-center gap-2">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View
                    </a>
                    <button
                      on:click={() => removeFile(index)}
                      class="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-white/10 pt-4">
        <Button
          variant="ghost"
          on:click={handleCancel}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <X class="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          on:click={handleSubmit}
          disabled={!formData.start_time || !formData.work_description || !!timeError}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Save class="w-4 h-4 mr-2" />
          {claim ? "Update Claim" : "Create Claim"}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
