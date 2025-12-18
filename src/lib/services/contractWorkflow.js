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
      subject: `Contract ${status} - ${contract.student_name || contract.student_email}`,
      content: `**Contract Final Decision**

Student: ${contract.student_name || contract.student_email}
Contract Status: ${status}
Reviewed by: ${adminEmail}

${approved ? 
        `The contract has been approved! Please notify your student that they can begin their internship.` :
        `The contract has been rejected. Admin feedback:\n${feedback}\n\nPlease work with the student to address these issues and resubmit.`
      }

**Next Steps:**
${approved ? 
        '- Notify student of approval\n- Begin internship coordination' :
        '- Review admin feedback\n- Work with student on revisions\n- Resubmit when ready'
      }`,
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