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
} from "./society.controller.js";

const router = Router();

// ─── Society CRUD ──────────────────────────────────────────────────────────

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["TEACHER"] }),
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
  authorize({ userTypes: ["TEACHER", "STUDENT"] }),
  validate(updateSocietySchema),
  handleUpdateSociety
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
  authorize({ userTypes: ["TEACHER", "STUDENT"] }),
  validate(listJoinRequestsSchema),
  handleListJoinRequests
);

router.patch(
  "/:id/join-requests/:requestId",
  authenticate,
  authorize({ userTypes: ["TEACHER", "STUDENT"] }),
  validate(reviewJoinRequestSchema),
  handleReviewJoinRequest
);

// ─── Members ───────────────────────────────────────────────────────────────

router.post(
  "/:id/members",
  authenticate,
  authorize({ userTypes: ["TEACHER", "STUDENT"] }),
  validate(addMemberSchema),
  handleAddMember
);

router.delete(
  "/:id/members/:userId",
  authenticate,
  authorize({ userTypes: ["TEACHER", "STUDENT"] }),
  validate(removeMemberSchema),
  handleRemoveMember
);

router.get(
  "/:id/members",
  authenticate,
  authorize({ userTypes: ["TEACHER", "STUDENT"] }),
  validate(listMembersSchema),
  handleListMembers
);

export default router;
