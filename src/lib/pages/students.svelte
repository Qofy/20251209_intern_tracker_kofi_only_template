<script>
  import { onMount } from 'svelte';
  import { Student } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import { Plus, User, Trash2, Edit } from 'lucide-svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';

  $: user = $userStore.user;

  let students = [];
  let isFormOpen = false;
  let editingStudent = null;
  let formData = {
    full_name: "",
    student_email: "",
    contract_hours: 0,
    start_date: "",
    end_date: "",
    mentor_email: ""
  };

  onMount(() => {
    loadStudents();
  });

  async function loadStudents() {
    const studentData = await Student.list();
    students = studentData;
  }

  async function handleSave() {
    const studentData = {
      ...formData,
      mentor_email: formData.mentor_email || user?.email
    };

    if (editingStudent) {
      await Student.update(editingStudent.id, studentData);
    } else {
      await Student.create(studentData);
    }
    editingStudent = null;
    isFormOpen = false;
    loadStudents();
    resetForm();
  }

  async function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this student contract?")) {
      await Student.delete(id);
      loadStudents();
    }
  }

  function openForm(student = null) {
    editingStudent = student;
    if (student) {
      formData = { ...student };
    } else {
      resetForm();
    }
    isFormOpen = true;
  }

  function resetForm() {
    formData = {
      full_name: "",
      student_email: "",
      contract_hours: 0,
      start_date: "",
      end_date: "",
      mentor_email: ""
    };
  }

  function getContractProgress(student) {
    return Math.floor(Math.random() * student.contract_hours);
  }
</script>

<div class="p-8">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white flex items-center gap-3">
        <User class="w-8 h-8 text-blue-400" />
        Student Contract Management
      </h1>
      <p class="text-white/70 mt-2">Create and manage student internship contracts</p>
    </div>
    <Button
      on:click={() => openForm()}
      class="bg-emerald-500 hover:bg-emerald-600 text-white flex h-10 items-center px-2 rounded-md"
    >
      <Plus class="w-4 h-4 mr-2" />
      New Student Contract
    </Button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each students as student (student.id)}
      {@const progress = getContractProgress(student)}
      {@const percentage = Math.round((progress / student.contract_hours) * 100)}
      <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-bold text-white mb-1">{student.full_name}</h3>
            <p class="text-white/60 text-sm">{student.student_email}</p>
          </div>
          <div class="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              on:click={() => openForm(student)}
              class="text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
            >
              <Edit class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              on:click={() => handleDelete(student.id)}
              class="text-red-400 hover:bg-red-500/20 hover:text-red-300"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-white/80">Contract Hours:</span>
            <span class="text-white font-semibold">{student.contract_hours}h</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-white/80">Progress:</span>
            <span class="text-amber-400 font-semibold">{progress}h ({percentage}%)</span>
          </div>

          <div class="w-full bg-white/10 rounded-full h-2 border border-white/20">
            <div
              class="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500"
              style="width: {Math.min(percentage, 100)}%"
            />
          </div>

          <div class="flex justify-between items-center text-sm">
            <span class="text-white/60">Start: {student.start_date}</span>
            <span class="text-white/60">End: {student.end_date || 'Ongoing'}</span>
          </div>

          <div class="pt-2 border-t border-white/10">
            <p class="text-white/60 text-sm">
              Mentor: <span class="text-white">{student.mentor_email}</span>
            </p>
          </div>
        </div>
      </div>
    {/each}

    {#if students.length === 0}
      <div class="col-span-full flex flex-col items-center py-12">
        <User class="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-white mb-2">No Student Contracts</h3>
        <p class="text-white/60 mb-6">Create your first student contract to get started.</p>
        <Button
          on:click={() => openForm()}
          class="bg-emerald-500 hover:bg-emerald-600 text-white h-10 flex items-center px-2 rounded-md"
        >
          <Plus class="w-5 h-5 mr-2 " />
          Create First Contract
        </Button>
      </div>
    {/if}
  </div>

  {#if isFormOpen}
    <Dialog open={true} on:close={() => { isFormOpen = false; resetForm(); }}>
      <div class="bg-white/10 backdrop-blur-md border-white/20 text-white rounded-xl p-6">
        <h2 class="text-xl font-bold mb-4">{editingStudent ? "Edit Student Contract" : "Create New Student Contract"}</h2>
        <div class="space-y-4 py-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/80 block mb-2">Full Name</label>
              <Input
                bind:value={formData.full_name}
                class="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label class="text-white/80 block mb-2">Student Email</label>
              <Input
                type="email"
                bind:value={formData.student_email}
                class="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/80 block mb-2">Contract Hours</label>
              <Input
                type="number"
                bind:value={formData.contract_hours}
                class="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label class="text-white/80 block mb-2">Mentor Email</label>
              <Input
                type="email"
                bind:value={formData.mentor_email}
                class="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/80 block mb-2">Start Date</label>
              <Input
                type="date"
                bind:value={formData.start_date}
                class="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label class="text-white/80 block mb-2">End Date</label>
              <Input
                type="date"
                bind:value={formData.end_date}
                class="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-4 border-t border-white/10 pt-4">
          <Button
            variant="ghost"
            on:click={() => { isFormOpen = false; resetForm(); }}
            class="text-white/80 hover:text-white hover:bg-white/10 h-9 px-1.5 rounded-md"
          >
            Cancel
          </Button>
          <Button
            on:click={handleSave}
            class="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-1.5 rounded-md"
            disabled={!formData.full_name || !formData.student_email || !formData.mentor_email}
          >
            Save Contract
          </Button>
        </div>
      </div>
    </Dialog>
  {/if}
</div>
