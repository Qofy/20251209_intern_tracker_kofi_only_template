<script>
  import { onMount } from 'svelte';
  import { Student, StudentDocument } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import { goto } from '@roxi/routify';
  import Button from '../../lib/components/ui/button/button.svelte';
  import Badge from '../../lib/components/ui/badge/badge.svelte';
  import { Plus, User, Trash2, FileArchive, Eye } from 'lucide-svelte';
  import RequirementsChecker from '../../lib/components/students/RequirementsChecker.svelte';

  let students = [];
  let managingDocuments = null;

  onMount(() => {
    loadStudents();
  });

  async function loadStudents() {
    const studentData = await Student.list('-created_date');
    students = studentData;
  }

  async function handleDelete(e, id) {
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      await Student.delete(id);
      loadStudents();
    }
  }

  function handleImpersonate(e, student) {
    e.preventDefault();
    userStore.update(state => ({
      ...state,
      selectedStudent: student
    }));
  }

  function openDocsManager(e, student) {
    e.preventDefault();
    managingDocuments = student;
  }

  function getStatusColor(status) {
    const colors = {
      active: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      completed: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      paused: 'bg-amber-500/20 text-amber-300 border-amber-400/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-400/30';
  }
</script>

<div class="p-8">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white flex items-center gap-3">
        <User class="w-8 h-8 text-red-400" />
        Student Management (Admin)
      </h1>
      <p class="text-white/70 mt-2">Full CRUD access to all student profiles and documents</p>
    </div>
    <Button
      on:click={() => $goto('/admin-student-edit')}
      class="bg-emerald-500 hover:bg-emerald-600 text-white"
    >
      <Plus class="w-4 h-4 mr-2" />
      New Student
    </Button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each students as student (student.id)}
      <a
        href="/admin-student-edit?id={student.id}"
        on:click={(e) => { e.preventDefault(); $goto(`/admin-student-edit?id=${student.id}`); }}
        class="block bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg hover:border-white/40 transition-colors duration-300"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3 class="text-xl font-bold text-white mb-1">{student.full_name}</h3>
            <p class="text-white/60 text-sm mb-2">{student.student_email}</p>
            <Badge class={getStatusColor(student.status) + ' text-xs'}>
              {student.status}
            </Badge>
          </div>
          <div class="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              on:click={(e) => openDocsManager(e, student)}
              title="Manage Documents"
              class="text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
            >
              <FileArchive class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              on:click={(e) => handleDelete(e, student.id)}
              title="Delete Student"
              class="text-red-400 hover:bg-red-500/20 hover:text-red-300"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div class="space-y-3 mb-4">
          <div class="flex justify-between items-center">
            <span class="text-white/80">Contract Hours:</span>
            <span class="text-white font-semibold">{student.contract_hours}h</span>
          </div>

          <div class="flex justify-between items-center text-sm">
            <span class="text-white/60">Start: {student.start_date || 'Not set'}</span>
            <span class="text-white/60">End: {student.end_date || 'Ongoing'}</span>
          </div>

          <div class="pt-2 border-t border-white/10">
            <p class="text-white/60 text-sm">
              Mentor: <span class="text-white">{student.mentor_email || 'Unassigned'}</span>
            </p>
          </div>
        </div>

        <Button
          on:click={(e) => handleImpersonate(e, student)}
          class="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/30"
        >
          <Eye class="w-4 h-4 mr-2" />
          Impersonate Student
        </Button>
      </a>
    {/each}

    {#if students.length === 0}
      <div class="col-span-full text-center py-12">
        <User class="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-white mb-2">No Students Found</h3>
        <p class="text-white/60 mb-6">Create the first student profile to get started.</p>
        <Button
          on:click={() => $goto('/admin-student-edit')}
          class="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Plus class="w-5 h-5 mr-2" />
          Create First Student
        </Button>
      </div>
    {/if}
  </div>

  {#if managingDocuments}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
      <div class="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl p-6 max-w-6xl max-h-[80vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-4">Document Management - {managingDocuments.full_name}</h2>
        <RequirementsChecker student={managingDocuments} />
        <Button on:click={() => managingDocuments = null} class="mt-4">Close</Button>
      </div>
    </div>
  {/if}
</div>
