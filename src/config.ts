// endpoints.ts
const BASE_URL = "https://here-encounter-homes-his.trycloudflare.com";
// const BASE_URL = "http://localhost:3000";

// const BASE_URL = "https://api-test-pi-rosy.vercel.app";


const ENDPOINTS = {
  // UPLOAD_PENDING: `${BASE_URL}/pending`,
  // UPLOAD_APPROVED: `${BASE_URL}/approved`,
  GET_IMAGES: `${BASE_URL}/images`,

  LOGIN: `${BASE_URL}/login`,
  REGISTER: `${BASE_URL}/register`,
  GET_PENDING: `${BASE_URL}/getPendingFiles`,
  GET_APPROVED: `${BASE_URL}/getApprovedFiles`,
  NEWPROJECT: `${BASE_URL}/newproject`,
  PROJECTLIST: `${BASE_URL}/projectlist`,
  PROJECTDETAIL: `${BASE_URL}/projectdetails`,
  PROJECTINFO: `${BASE_URL}/projectinfo`,
  UPLOAD: `${BASE_URL}/upload`,
  GETPROJECTIMAGES: `${BASE_URL}/project/images`,
  DELETEPROJECT: `${BASE_URL}/deleteProject`,
  UPLOAD_AVATAR: `${BASE_URL}/upload/avatar`,
  image_url: "https://here-encounter-homes-his.trycloudflare.com/",
  videos: `${BASE_URL}/videos`,
  IMAGE_URL: `${BASE_URL}/`,
  UPLOAD_VIDEO: `${BASE_URL}/upload/video`,
  VIDEOS: `${BASE_URL}/videos`,
  DELETEPROJECTIMAGE: `${BASE_URL}/deleteProjectImage`,
  PEOPLE: `${BASE_URL}/people`,
  GETPEOPLE: `${BASE_URL}/getpeople`,
  SEATS: `${BASE_URL}/seats`,
  STATUSPEOPLE: `${BASE_URL}/statuspeople`,
  PROJECT_SEQUENCES: `${BASE_URL}/project-sequences`,
  UPDATE_SEQUENCE: `${BASE_URL}/project-sequences/update`,
  CREATE_SEQUENCE: `${BASE_URL}/project-sequences/create`,
  UPLOAD_SEQUENCE: `${BASE_URL}/sequence/upload`,
  SHOTLIST: `${BASE_URL}/shotlist`,
  UPDATESHOT: `${BASE_URL}/updateshot`,
  CREATESHOT: `${BASE_URL}/createshot`,
  GETSEQUENCE: `${BASE_URL}/getsequence`,
  UPLOAD_SHOT: `${BASE_URL}/shot/upload`,
  CREATEASSETS: `${BASE_URL}/createasset`,
  ASSETLIST: `${BASE_URL}/assetlist`,
  UPDATEASSET: `${BASE_URL}/updateasset`,
  ASSETUPLOAD: `${BASE_URL}/asset/upload`,
  GETSHOTS: `${BASE_URL}/getshots`,
  PROJECT_SHOT_STATS: `${BASE_URL}/projectDetail-shots/Calculator`,
  PROJECT_ASSET_STATS: `${BASE_URL}/projectDetail-assets/Calculator`,
  PROJECT_SEQUENCE_STATS: `${BASE_URL}/projectDetail-sequences/Calculator`,
  UPLOAD_ASSET: `${BASE_URL}/asset/upload`,

  DELETE_SEQUENCE: `${BASE_URL}/project-sequences`,
  DELETE_SHOT: `${BASE_URL}/project-shots`,
  DELETE_ASSET: `${BASE_URL}/project-assets`,
  PROJECT_SEQUENCE_DETAIL: `${BASE_URL}/project-sequence-detail`,
  PROJECT_SHOT_DETAIL: `${BASE_URL}/project-shot-detail`,
  PROJECT_ASSET_DETAIL: `${BASE_URL}/project-asset-detail`,
  DELETEPEOPLE: `${BASE_URL}/delete-people`,
  // PROJECT_TASKS: `${BASE_URL}/project-tasks`,
  MY_TASKS: `${BASE_URL}/my-tasks`,

  CREATE_TASK_ASSET: `${BASE_URL}/create-task-assets`,
  // ใน ENDPOINTS object
  GET_PROJECT_ASSETS: `${BASE_URL}/get-project-assets`,
  GET_ASSET_SEQUENCE: `${BASE_URL}/get-asset-sequence`,
  ADD_ASSET_TO_SEQUENCE: `${BASE_URL}/add-asset-to-sequence`,
  REMOVE_ASSET_FROM_SEQUENCE: `${BASE_URL}/remove-asset-from-sequence`,

  GET_SHOT_NULL: `${BASE_URL}/get-shot-null`,              // ดึง shots ที่ sequence_id = NULL
  ADD_SHOT_TO_SEQUENCE: `${BASE_URL}/add-shot-to-sequence`, // เชื่อม shot เข้า sequence
  REMOVE_SHOT_FROM_SEQUENCE: `${BASE_URL}/remove-shot-from-sequence`,
  ADD_SEQUENCE_TO_SHOT: `${BASE_URL}/add-sequence-to-shot`,
  REMOVE_SEQUENCE_FROM_SHOT: `${BASE_URL}/remove-sequence-from-shot`,

  ADD_ASSET_TO_SHOT: `${BASE_URL}/add-asset-to-shot`,
  REMOVE_ASSET_FROM_SHOT: `${BASE_URL}/remove-asset-from-shot`,
  GET_ASSET_SHOT: `${BASE_URL}/get-asset-shot`,
  // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++ new
  SHOT_TASK: `${BASE_URL}/shot-task`,
  SEQUENCE_TASK: `${BASE_URL}/sequence-task`,
  ASSET_TASK: `${BASE_URL}/asset-task`,
  GET_ASSET_SEQUENCES_JOIN: `${BASE_URL}/get-asset-sequences-join`,
  GET_ASSET_SHOTS_JOIN: `${BASE_URL}/get-asset-shots-join`,

  PROJECT_TASKS_GROUPED: `${BASE_URL}/project-tasks-grouped`,
  PIPELINE_STEPS: `${BASE_URL}/pipeline-steps`,

  UPDATE_TASK: `${BASE_URL}/updatetask`,

  ADD_TASK_ASSIGNEE: `${BASE_URL}/add-task-assignee`,
  REMOVE_TASK_ASSIGNEE: `${BASE_URL}/remove-task-assignee`,
  ADD_TASK_REVIEWER: `${BASE_URL}/add-task-reviewer`,
  REMOVE_TASK_REVIEWER: `${BASE_URL}/remove-task-reviewer`,
  PROJECT_USERS: `${BASE_URL}/project-users`,

  GETALLPEOPLE: `${BASE_URL}/getallpeople`,
  CREATE_ASSET_NOTE: `${BASE_URL}/create-asset-note`,
  GET_NOTES: `${BASE_URL}/get-notes`,
  DELETE_NOTE: `${BASE_URL}/delete-note`,

  SECRET_VERIFY: `${BASE_URL}/verify-secret`,
  SECRET_EXECUTE: `${BASE_URL}/execute`,
  SECRET_TABLES: `${BASE_URL}/tables`,
  SECRET_LOGS: `${BASE_URL}/logs`,

  ADD_TASK: `${BASE_URL}/add-task`,
  CREATE_SHOT_NOTE: `${BASE_URL}/create-shot-note`,
  CREATE_SEQUENCE_NOTE: `${BASE_URL}/create-sequence-note`,

  UPDATE_ASSET: `${BASE_URL}/update-asset`,
  UPDATE_SHOT: `${BASE_URL}/update-shot`,

  PROJECT_VIEWERS: `${BASE_URL}/project-viewers`,
  PROJECT_VIEWERS_ADD: `${BASE_URL}/project-viewers-add`,
  PROJECT_VIEWERS_REMOVE: `${BASE_URL}/project-viewers-remove`,
  GETALLUSERS: `${BASE_URL}/getallusers`,

  TASK_VERSIONS: `${BASE_URL}/task-versions`,
  UPDATE_VERSION: `${BASE_URL}/update-version`,

  ADD_VERSION: `${BASE_URL}/add-version`,
  DELETE_VERSION: `${BASE_URL}/delete-version`,
  EDIT_NOTE: `${BASE_URL}/edit-note`,

  DELETE_TASK: `${BASE_URL}/delete-task`,
  // เพิ่ม endpoint อื่น ๆ ตามต้องการ
};

export default ENDPOINTS;
