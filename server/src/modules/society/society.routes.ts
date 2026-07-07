import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createSocietySchema,
  listSocietiesSchema,
  societyPublicIdParamSchema,
  societyLifecycleReasonSchema,
  updateSocietyStatusSchema,
  updateSocietySchema,
  joinRequestSchema,
  listJoinRequestsSchema,
  reviewJoinRequestSchema,
  addMemberSchema,
  removeMemberSchema,
  listMembersSchema,
  listMemberCandidatesSchema,
  leadershipConflictsSchema,
  listLeadershipCandidatesSchema,
} from "./society.schema.js";
import {
  handleCreateSociety,
  handleListSocieties,
  handleGetSociety,
  handleUpdateSociety,
  handleSubmitJoinRequest,
  handleListJoinRequests,
  handleReviewJoinRequest,
  handleAddMember,
  handleRemoveMember,
  handleListMembers,
  handleGetMyMembershipStatus,
  handleListMemberCandidates,
  handleListLeadershipCandidates,
  handleGetSocietyDeletionImpact,
  handleGetSocietyLeadershipConflicts,
  handleUpdateSocietyStatus,
  handleDeleteSociety,
  handleRestoreSociety,
} from "./society.controller.js";

const router = Router();

// ─── Society CRUD ──────────────────────────────────────────────────────────

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(createSocietySchema),
  handleCreateSociety
);

router.get(
  "/",
  authenticate,
  validate(listSocietiesSchema),
  handleListSocieties
);

router.get(
  "/leadership-candidates",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(listLeadershipCandidatesSchema),
  handleListLeadershipCandidates
);

router.get(
  "/:publicId/deletion-impact",
  authenticate,
  validate(societyPublicIdParamSchema),
  handleGetSocietyDeletionImpact
);

router.get(
  "/:publicId/leadership-conflicts",
  authenticate,
  validate(leadershipConflictsSchema),
  handleGetSocietyLeadershipConflicts
);

router.patch(
  "/:publicId/status",
  authenticate,
  validate(updateSocietyStatusSchema),
  handleUpdateSocietyStatus
);

router.patch(
  "/:publicId/restore",
  authenticate,
  validate(societyLifecycleReasonSchema),
  handleRestoreSociety
);

router.delete(
  "/:publicId",
  authenticate,
  validate(societyLifecycleReasonSchema),
  handleDeleteSociety
);

router.get(
  "/:publicId",
  authenticate,
  validate(societyPublicIdParamSchema),
  handleGetSociety
);

router.patch(
  "/:publicId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(updateSocietySchema),
  handleUpdateSociety
);

router.get(
  "/:publicId/my-membership",
  authenticate,
  validate(societyPublicIdParamSchema),
  handleGetMyMembershipStatus
);

// ─── Join Requests ─────────────────────────────────────────────────────────

router.post(
  "/:publicId/join-request",
  authenticate,
  authorize({ userTypes: ["STUDENT"] }),
  validate(joinRequestSchema),
  handleSubmitJoinRequest
);

router.get(
  "/:publicId/join-requests",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(listJoinRequestsSchema),
  handleListJoinRequests
);

router.patch(
  "/:publicId/join-requests/:requestId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(reviewJoinRequestSchema),
  handleReviewJoinRequest
);

// ─── Members ───────────────────────────────────────────────────────────────

router.post(
  "/:publicId/members",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(addMemberSchema),
  handleAddMember
);

router.delete(
  "/:publicId/members/:userPublicId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(removeMemberSchema),
  handleRemoveMember
);

router.get(
  "/:publicId/member-candidates",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(listMemberCandidatesSchema),
  handleListMemberCandidates
);

router.get(
  "/:publicId/members",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(listMembersSchema),
  handleListMembers
);

export default router;
