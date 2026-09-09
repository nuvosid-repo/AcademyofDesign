// Permission matrix for the Add/Edit Role screen.
// Grouped exactly like the admin reference: each module has a set of actions.
export const PERMISSION_GROUPS = [
  {
    group: "Admin",
    modules: [
      { key: "all_transaction", label: "All Transaction", actions: ["View All Transactions"] },
      { key: "banner", label: "Banner", actions: ["Add", "View"] },
      { key: "notification", label: "Notification", actions: ["Add", "Delete", "Edit", "View"] },
      { key: "qualification", label: "Qualification", actions: ["Add", "Delete", "Edit", "View"] },
      { key: "role", label: "Role", actions: ["Add", "Delete", "Edit", "View"] },
      { key: "user", label: "User", actions: ["Add", "Change Password", "Delete", "Edit", "View"] },
    ],
  },
  {
    group: "Course",
    modules: [
      { key: "certification_request", label: "Certification Request", actions: ["Approve Requests", "Reject Requests", "View Requests"] },
      { key: "course", label: "Course", actions: ["Add", "Delete", "Detail", "Edit", "Videos", "View"] },
      { key: "course_qa", label: "Course: Question Answer", actions: ["Add", "Delete", "Edit", "View"] },
      { key: "course_review", label: "Course: Review", actions: ["Add", "Delete", "Edit", "View"] },
      { key: "instructor", label: "Instructor", actions: ["Add", "Delete", "Edit", "View"] },
      { key: "video", label: "Video", actions: ["Add", "Delete", "Detail", "Edit", "View"] },
    ],
  },
  {
    group: "Manage Course",
    modules: [
      { key: "manage_course", label: "Manage Course", actions: ["Detail", "View"] },
      { key: "manage_course_file", label: "Manage Course: File", actions: ["Add", "Delete", "Download"] },
      { key: "manage_course_folder", label: "Manage Course: Folder", actions: ["Add", "Delete", "Detail", "Rename"] },
      { key: "manage_course_video_assoc", label: "Manage Course: Video Association", actions: ["Add", "Delete"] },
    ],
  },
  {
    group: "Student",
    modules: [
      { key: "signup_request", label: "Signup Request", actions: ["Approve Requests", "Delete Requests", "Reject Requests", "View Requests"] },
      { key: "student", label: "Student", actions: ["Add", "Change Password", "Delete", "Detail", "Edit", "View"] },
      { key: "student_course_assignment", label: "Student: Course Assignment", actions: ["Add", "Delete", "Detail", "Edit", "View"] },
      { key: "student_transaction", label: "Student: Transaction", actions: ["View"] },
    ],
  },
];
