<script>
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { Wand2, Loader2, FileUp, Download } from 'lucide-svelte';
  import { UploadFile } from '$lib/integrations/Core';
  import { InvokeLLM } from '$lib/integrations/Core';

  export let date;
  export let onScheduleCreate;
  export let onScheduleUpdate;
  export let existingSchedule = null;
  export let selectedStudent = null;
  export let isStudent = false;
  export let currentUser = null;

  let rawText = existingSchedule?.raw_text || "";
  let materials = existingSchedule?.materials || [];
  let isParsing = false;
  let isSaving = false;
  let isUploading = false;

  $: hasValidContext = (selectedStudent && selectedStudent.student_email) || (isStudent && currentUser);

  async function handleParse() {
    if ((!selectedStudent && !isStudent) || !rawText) return;
    
    isParsing = true;
    try {
      const prompt = `Parse the following schedule text into a structured JSON array. Each item should have "start_time", "end_time", and "activity". Extract times in HH:mm format. If a task reference like "TASK #056" is mentioned, include a "task_reference" field.

Example format:
Input: "6:00 to 9:30 Start GPT course from Chapter 9"
Output: {"start_time": "06:00", "end_time": "09:30", "activity": "Start GPT course from Chapter 9", "task_reference": ""}

Input: "9:45 Learn TASK #056"
Output: {"start_time": "09:45", "end_time": "", "activity": "Learn TASK #056", "task_reference": "TASK #056"}

Text to parse:
${rawText}`;

      const schema = {
        type: "object",
        properties: {
          schedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                start_time: { type: "string" },
                end_time: { type: "string" },
                activity: { type: "string" },
                task_reference: { type: "string" }
              },
              required: ["start_time", "activity"]
            }
          }
        },
        required: ["schedule"]
      };
      
      const result = await InvokeLLM({ prompt, response_json_schema: schema });
      if (result.schedule) {
        await handleSave(result.schedule);
      }
    } catch (error) {
      console.error("Error parsing schedule:", error);
      alert("Error parsing schedule. Please try again.");
    }
    isParsing = false;
  }

  async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0 || (!selectedStudent && !isStudent)) return;
    
    isUploading = true;
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(result => result.file_url);
      materials = [...materials, ...fileUrls];
    } catch (error) {
      console.error("Error uploading materials:", error);
      alert("Error uploading materials. Please try again.");
    }
    isUploading = false;
  }

  async function handleSave(parsedSchedule = null) {
    let studentEmail = null;

    if (isStudent && currentUser) {
      studentEmail = currentUser.email;
    } else if (selectedStudent) {
      studentEmail = selectedStudent.student_email;
    }

    if (!studentEmail) {
      console.error("No student email available for schedule creation");
      alert("Please select a student to create a schedule for.");
      return;
    }

    isSaving = true;
    const scheduleData = {
      date: date,
      student_email: studentEmail,
      raw_text: rawText,
      parsed_schedule: parsedSchedule || existingSchedule?.parsed_schedule,
      materials: materials,
      created_by_mentor: !isStudent
    };

    try {
      if (existingSchedule?.id) {
        await onScheduleUpdate(existingSchedule.id, scheduleData);
      } else {
        await onScheduleCreate(scheduleData);
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert("Error saving schedule. Please try again.");
    }
    isSaving = false;
  }
</script>

<div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
  <h3 class="text-xl font-bold text-white mb-4">Schedule Creator</h3>

  {#if !hasValidContext}
    <div class="text-center py-8 mb-4">
      <p class="text-white/60 mb-2">No student selected</p>
      <p class="text-white/40 text-sm">Please select a student to create a schedule</p>
    </div>
  {:else}
    <p class="text-white/70 text-sm mb-4">
      Creating schedule for: <span class="font-semibold text-purple-300">
        {isStudent ? 'You' : selectedStudent?.full_name || selectedStudent?.student_email}
      </span>
    </p>
  {/if}

  <Textarea
    bind:value={rawText}
    placeholder="Schedule Kelvin, August 26th, I suggest the following
6:00 to 9:30 Start GPT course from Chapter 9
9:30 to 9:45 break
9:45 Learn TASK #056
11:45 Break
12:00 Learn RUST Machine Learning Course
13:00 to 13:30 Lunch
13:30 to 14:00 document upload your work , write questions
14:00 Meet Present Question/Answer
TASK #056"
    className="bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[150px] mb-4"
    disabled={!hasValidContext}
  />

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <Button
      on:click={handleParse}
      disabled={isParsing || !rawText || !hasValidContext}
      className="bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
    >
      {#if isParsing}
        <Loader2 class="w-4 h-4 mr-2 animate-spin" />
      {:else}
        <Wand2 class="w-4 h-4 mr-2" />
      {/if}
      {isParsing ? "Parsing..." : "Parse Schedule"}
    </Button>
    <Button
      on:click={() => handleSave()}
      disabled={isSaving || !hasValidContext}
      className="bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
    >
      {#if isSaving}
        <Loader2 class="w-4 h-4 mr-2 animate-spin" />
      {:else}
        <Download class="w-4 h-4 mr-2" />
      {/if}
      {isSaving ? "Saving..." : "Save Schedule"}
    </Button>
  </div>

  <div class="mb-4">
    <label class="text-white/80 text-sm font-medium mb-3 block">Attach Materials</label>
    <div class="relative">
      <input
        type="file"
        multiple
        on:change={handleFileUpload}
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading || !hasValidContext}
      />
      <div class="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
        <FileUp class="w-8 h-8 text-white/50 mx-auto mb-3" />
        <p class="text-white/80 font-medium">
          {isUploading ? "Uploading..." : "Click to upload materials"}
        </p>
      </div>
    </div>
  </div>
  
  {#if materials.length > 0}
    <div class="space-y-2">
      {#each materials as file, index}
        <a 
          href={file} 
          target="_blank" 
          rel="noopener noreferrer" 
          class="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10 text-white/80 hover:bg-white/10 text-sm"
        >
          <Download class="w-4 h-4 text-blue-400" />
          Material {index + 1}
        </a>
      {/each}
    </div>
  {/if}
</div>
