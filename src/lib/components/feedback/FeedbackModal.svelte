<script>
  import { userStore, isMentor, isStudent, isAdmin } from '$lib/stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Label from '$lib/components/ui/label.svelte';
  import Select from '$lib/components/ui/select.svelte';
  import SelectContent from '$lib/components/ui/SelectContent.svelte';
  import SelectItem from '$lib/components/ui/SelectItem.svelte';
  import SelectTrigger from '$lib/components/ui/SelectTrigger.svelte';
  import SelectValue from '$lib/components/ui/SelectValue.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import DialogContent from '$lib/components/ui/DialogContent.svelte';
  import DialogHeader from '$lib/components/ui/DialogHeader.svelte';
  import DialogTitle from '$lib/components/ui/DialogTitle.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import { X, Send, Image as ImageIcon, Info } from 'lucide-svelte';
  import { SendEmail } from '$lib/integrations/Core';

  export let type;
  export let screenshot = null;
  export let pageInfo;
  export let onClose;

  let formData = {
    title: '',
    description: '',
    priority: 'medium',
    contactEmail: $userStore?.email || '',
    contactPhone: '',
    reproductionSteps: '',
  };

  let isSubmitting = false;
  let showPageInfo = false;
  let open = true;

  $: isBugReport = type === 'bug';
  $: title = isBugReport ? 'Report a Bug' : 'Request Enhancement';
  $: submitText = isBugReport ? 'Submit Bug Report' : 'Submit Enhancement Request';
  $: role = $isMentor ? 'mentor' : $isStudent ? 'student' : $isAdmin ? 'admin' : 'unknown';

  function handleInputChange(field, value) {
    formData = { ...formData, [field]: value };
  }

  async function handleSubmit() {
    if (!formData.title || !formData.description || (!$userStore && !formData.contactEmail)) {
      alert('Please fill in all required fields');
      return;
    }

    isSubmitting = true;

    try {
      // Prepare the report data
      const reportData = {
        type: isBugReport ? 'Bug Report' : 'Enhancement Request',
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        reproductionSteps: formData.reproductionSteps,
        userInfo: {
          userId: $userStore?.id,
          userEmail: $userStore?.email,
          userName: $userStore?.full_name,
          userRole: role,
          selectedStudent: $userStore?.selectedStudent ? {
            id: $userStore.selectedStudent.id,
            name: $userStore.selectedStudent.full_name,
            email: $userStore.selectedStudent.student_email
          } : null,
        },
        pageInfo,
        timestamp: new Date().toISOString(),
      };

      // Send email report
      const emailSubject = `${isBugReport ? '🐛 Bug Report' : '💡 Enhancement Request'}: ${formData.title}`;
      const emailBody = `
        <h2>${title}</h2>
        <p><strong>Title:</strong> ${formData.title}</p>
        <p><strong>Priority:</strong> ${formData.priority}</p>
        <p><strong>Description:</strong></p>
        <div>${formData.description}</div>

        ${formData.reproductionSteps ? `
        <p><strong>Reproduction Steps:</strong></p>
        <div>${formData.reproductionSteps}</div>
        ` : ''}

        <h3>Contact Information</h3>
        <p><strong>Email:</strong> ${formData.contactEmail}</p>
        ${formData.contactPhone ? `<p><strong>Phone:</strong> ${formData.contactPhone}</p>` : ''}

        <h3>User Context</h3>
        <p><strong>User ID:</strong> ${$userStore?.id || 'Not logged in'}</p>
        <p><strong>User Email:</strong> ${$userStore?.email || 'Not logged in'}</p>
        <p><strong>User Role:</strong> ${role || 'Unknown'}</p>
        ${$userStore?.selectedStudent ? `<p><strong>Selected Student:</strong> ${$userStore.selectedStudent.full_name} (${$userStore.selectedStudent.student_email})</p>` : ''}

        <h3>Technical Details</h3>
        <p><strong>URL:</strong> ${pageInfo.url}</p>
        <p><strong>Timestamp:</strong> ${pageInfo.timestamp}</p>
        <p><strong>Browser:</strong> ${pageInfo.userAgent}</p>
        <p><strong>Viewport:</strong> ${pageInfo.viewport.width}x${pageInfo.viewport.height}</p>

        ${screenshot ? '<p><strong>Screenshot:</strong> Attached</p>' : ''}
      `;

      await SendEmail({
        to: 'support@base44.app',
        subject: emailSubject,
        body: emailBody,
        from_name: `WorkTracker Feedback - ${$userStore?.full_name || formData.contactEmail}`
      });

      alert(`${isBugReport ? 'Bug report' : 'Enhancement request'} submitted successfully! We'll get back to you soon.`);
      handleClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }

    isSubmitting = false;
  }

  function handleClose() {
    open = false;
    onClose();
  }
</script>

<Dialog {open} onOpenChange={handleClose}>
  <DialogContent {open} onOpenChange={handleClose}>
    <div class="bg-white/10 backdrop-blur-md border-white/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg p-6">
      <DialogHeader>
        <DialogTitle>
          <div class="flex items-center gap-2 text-xl">
            {#if isBugReport}
              <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span class="text-white text-lg">🐛</span>
              </div>
            {:else}
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span class="text-white text-lg">💡</span>
              </div>
            {/if}
            {title}
          </div>
        </DialogTitle>
      </DialogHeader>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
        <!-- Main Form -->
        <div class="lg:col-span-2 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white/80 mb-2 block">Title *</Label>
              <Input
                bind:value={formData.title}
                placeholder={isBugReport ? "Brief description of the bug" : "Brief description of your idea"}
                className="bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>

            <div>
              <Label className="text-white/80 mb-2 block">Priority</Label>
              <Select bind:value={formData.priority} onValueChange={(val) => handleInputChange('priority', val)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white/80 mb-2 block">
              {isBugReport ? 'Bug Description *' : 'Enhancement Description *'}
            </Label>
            <Textarea
              bind:value={formData.description}
              placeholder={isBugReport ?
                "Describe what happened, what you expected to happen, and any error messages..." :
                "Describe your idea, how it would improve the app, and any specific requirements..."
              }
              className="bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[150px]"
            />
          </div>

          {#if isBugReport}
            <div>
              <Label className="text-white/80 mb-2 block">Steps to Reproduce</Label>
              <Textarea
                bind:value={formData.reproductionSteps}
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                className="bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[100px]"
              />
            </div>
          {/if}

          <!-- Contact Information -->
          {#if !$userStore}
            <div class="border-t border-white/10 pt-6">
              <h3 class="text-lg font-semibold text-white mb-4">Contact Information</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80 mb-2 block">Email *</Label>
                  <Input
                    type="email"
                    bind:value={formData.contactEmail}
                    placeholder="your.email@example.com"
                    className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white/80 mb-2 block">Phone (Optional)</Label>
                  <Input
                    bind:value={formData.contactPhone}
                    placeholder="+1 (555) 123-4567"
                    className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  />
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Screenshot and Info Panel -->
        <div class="lg:col-span-1 space-y-6">
          {#if screenshot}
            <div>
              <Label className="text-white/80 mb-2 flex items-center gap-2">
                <ImageIcon class="w-4 h-4" />
                Screenshot Captured
              </Label>
              <div class="bg-white/5 rounded-lg border border-white/20 p-3">
                <img
                  src={screenshot}
                  alt="Screenshot"
                  class="w-full h-auto rounded border border-white/10"
                />
              </div>
            </div>
          {/if}

          <div>
            <Button
              variant="ghost"
              on:click={() => showPageInfo = !showPageInfo}
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
            >
              <Info class="w-4 h-4 mr-2" />
              {showPageInfo ? 'Hide' : 'Show'} Technical Details
            </Button>

            {#if showPageInfo}
              <div class="mt-3 bg-white/5 rounded-lg border border-white/20 p-4">
                <div class="space-y-2 text-xs text-white/70">
                  <div><strong>URL:</strong> {pageInfo.url}</div>
                  <div><strong>Timestamp:</strong> {new Date(pageInfo.timestamp).toLocaleString()}</div>
                  <div><strong>Viewport:</strong> {pageInfo.viewport.width}x{pageInfo.viewport.height}</div>
                  {#if $userStore}
                    <div><strong>User:</strong> {$userStore.full_name || $userStore.email}</div>
                    <div><strong>Role:</strong> {role}</div>
                    {#if $userStore.selectedStudent}
                      <div><strong>Selected Student:</strong> {$userStore.selectedStudent.full_name}</div>
                    {/if}
                  {/if}
                </div>
              </div>
            {/if}
          </div>

          {#if $userStore}
            <div class="bg-green-500/10 rounded-lg border border-green-400/30 p-4">
              <h4 class="text-green-300 font-medium mb-2">Contact Info</h4>
              <div class="text-sm text-green-200/80">
                <div>Email: {$userStore.email}</div>
                <div>Name: {$userStore.full_name}</div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-white/10 pt-6">
        <Button
          variant="ghost"
          on:click={handleClose}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          on:click={handleSubmit}
          disabled={isSubmitting || !formData.title || !formData.description}
          className={`${isBugReport ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          <Send class="w-4 h-4 mr-2" />
          {isSubmitting ? 'Submitting...' : submitText}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
