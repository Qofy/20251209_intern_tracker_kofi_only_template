import { Message } from '../../entities/all.js';

/**
 * Contract Workflow Messaging Service
 * Handles automatic messages during contract review process
 */
export class ContractWorkflowService {
  
  /**
   * Send notification when student signs contract
   */
  static async notifyMentorOfStudentSignature(contract, studentEmail) {
    await Message.send({
      to_email: contract.mentor_email,
      to_role: 'Mentor',
      subject: `Contract Signed - ${contract.student_name || studentEmail}`,
      content: `**Contract Review Required**

Student: ${contract.student_name || studentEmail}
Email: ${studentEmail}
Contract ID: ${contract.id}

The student has signed their internship contract and it's now ready for your review. Please check the contract details and either approve it for admin review or provide feedback if changes are needed.

**Next Steps:**
- Review contract terms and student information
- Approve and forward to admin, OR
- Send feedback to student if changes needed`,
      message_type: 'contract_notification',
      mentor_email: contract.mentor_email
    });
  }

  /**
   * Send notification when mentor provides feedback to student
   */
  static async notifyStudentOfMentorFeedback(contract, mentorEmail, feedback) {
    await Message.send({
      to_email: contract.student_email,
      to_role: 'Student',
      subject: `Contract Feedback - Action Required`,
      content: `**Contract Review Feedback**

Your mentor has reviewed your contract and provided the following feedback:

**Mentor:** ${mentorEmail}
**Feedback:**
${feedback}

**Next Steps:**
Please review the feedback and make necessary updates to your contract, then re-sign when ready.`,
      message_type: 'contract_feedback',
      mentor_email: mentorEmail
    });
  }

  /**
   * Send notification when mentor forwards contract to admin
   */
  static async notifyAdminOfContractSubmission(contract, mentorEmail) {
    // Find admin email - using default for now
    const adminEmail = 'jesus@gmail.com';
    
    await Message.send({
      to_email: adminEmail,
      to_role: 'Admin',
      subject: `Contract Approval Required - ${contract.student_name || contract.student_email}`,
      content: `**Contract Ready for Final Approval**

Student: ${contract.student_name || contract.student_email}
Mentor: ${mentorEmail}
Contract ID: ${contract.id}

This contract has been reviewed and approved by the mentor and is now ready for your final review.

**Next Steps:**
- Review contract terms and approvals
- Approve contract, OR
- Reject with feedback for revision`,
      message_type: 'contract_admin_review',
      mentor_email: mentorEmail
    });
  }

  /**
   * Send notification when admin approves/rejects contract
   */
  static async notifyMentorOfAdminDecision(contract, adminEmail, approved, feedback) {
    const status = approved ? 'APPROVED' : 'REJECTED';
    
    await Message.send({
      to_email: contract.mentor_email,
      to_role: 'Mentor',
      subject: `Contract ${status} - Action Required: Notify ${contract.student_name || contract.student_email}`,
      content: `**Contract Final Decision - Please Notify Your Student**

Student: ${contract.student_name || contract.student_email}
Email: ${contract.student_email}
Contract Status: ${status}
Reviewed by Admin: ${adminEmail}

${approved ? 
        `✅ **GOOD NEWS!** The contract has been APPROVED by administration!\n\n**Admin Notes:**\n${feedback || 'No additional notes provided.'}` :
        `❌ **CONTRACT REJECTED** - Revisions needed.\n\n**Admin Feedback:**\n${feedback}\n\nThe student will need to make these changes before resubmission.`
      }

**🎯 IMPORTANT - Your Action Required:**
${approved ? 
        `Please contact your student immediately to inform them that:\n• Their contract is approved\n• They can officially begin their internship\n• You will coordinate next steps and task assignments` :
        `Please contact your student to explain:\n• Why the contract was rejected\n• What changes need to be made\n• How to address the admin's feedback\n• Timeline for resubmission`
      }

**Next Steps for You:**
${approved ? 
        '1. 📞 Contact student with approval news\n2. 📋 Begin internship coordination\n3. 🎯 Assign initial tasks and orientation\n4. 📅 Schedule first check-in meeting' :
        '1. 📞 Call/message student about rejection\n2. 📝 Explain required changes clearly\n3. 🤝 Offer guidance and support\n4. 📅 Set timeline for revision and resubmission'
      }

Contract ID: ${contract.id}`,
      message_type: 'contract_decision',
      mentor_email: contract.mentor_email
    });
  }

  /**
   * Send final notification to student about contract decision
   */
  static async notifyStudentOfFinalDecision(contract, approved, mentorEmail, feedback) {
    const status = approved ? 'APPROVED' : 'REJECTED';
    
    await Message.send({
      to_email: contract.student_email,
      to_role: 'Student',
      subject: `Internship Contract ${status}`,
      content: `**Your Contract Has Been ${status}**

${approved ? 
        `Congratulations! Your internship contract has been approved.\n\n**What's Next:**\n- You can now begin your internship\n- Your mentor will contact you with next steps\n- Check your dashboard for assigned tasks` :
        `Your contract requires revisions before approval.\n\n**Feedback:**\n${feedback}\n\n**What's Next:**\n- Review the feedback provided\n- Make necessary changes\n- Contact your mentor if you need assistance\n- Re-sign when ready`
      }

Mentor: ${mentorEmail}`,
      message_type: 'contract_final',
      mentor_email: mentorEmail
    });
  }
}