"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    bio: zod_1.z.string().max(500).optional(),
    jobTitle: zod_1.z.string().max(120).optional(),
    // Accepts a real URL, or "" to let the user clear their avatar.
    avatarUrl: zod_1.z.union([zod_1.z.string().url(), zod_1.z.literal("")]).optional(),
    name: zod_1.z.string().min(1).optional(),
});
