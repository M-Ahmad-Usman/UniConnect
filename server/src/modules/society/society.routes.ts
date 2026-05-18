import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createSocietySchema,
  listSocietiesSchema,
  societyIdParamSchema,
  updateSocietySchema,
  joinRequestSchema,
  listJoinRequestsSchema,
  reviewJoinRequestSchema,
  addMemberSchema,
  removeMemberSchema,
  listMembersSchema,
  listMemberCandidatesSchema,
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
  "/:id",
  authenticate,
  validate(societyIdParamSchema),
  handleGetSociety
);

router.patch(
  "/:id",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(updateSocietySchema),
  handleUpdateSociety
);

router.get(
  "/:id/my-membership",
  authenticate,
  validate(societyIdParamSchema),
  handleGetMyMembershipStatus
);

// ─── Join Requests ─────────────────────────────────────────────────────────

router.post(
  "/:id/join-request",
  authenticate,
  authorize({ userTypes: ["STUDENT"] }),
  validate(joinRequestSchema),
  handleSubmitJoinRequest
);

router.get(
  "/:id/join-requests",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(listJoinRequestsSchema),
  handleListJoinRequests
);

router.patch(
  "/:id/join-requests/:requestId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(reviewJoinRequestSchema),
  handleReviewJoinRequest
);

// ─── Members ───────────────────────────────────────────────────────────────

router.post(
  "/:id/members",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(addMemberSchema),
  handleAddMember
);

router.delete(
  "/:id/members/:userId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(removeMemberSchema),
  handleRemoveMember
);

router.get(
  "/:id/member-candidates",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(listMemberCandidatesSchema),
  handleListMemberCandidates
);

router.get(
  "/:id/members",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(listMembersSchema),
  handleListMembers
);

export default router;
