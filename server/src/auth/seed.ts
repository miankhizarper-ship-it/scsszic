import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { hashPassword } from "./password.js";
import { userRepository } from "./store.js";

/**
 * Demo user fixtures (spec §8–9).
 *
 * PHASE 7 — development fixtures, in-memory store.
 * PHASE 8 — same fixtures, now PERSISTED to MongoDB via the repository.
 *   Seeding is idempotent: existing accounts are never overwritten (their
 *   passwords stay as originally hashed), so restarting or re-seeding never
 *   clobbers user-generated auth data.
 *
 *   Accounts below are FICTIONAL demo identities. They exercise the auth
 *   architecture and the AuthUser → Member profile link. They are NOT real
 *   users and must never be given real credentials.
 *
 * Credentials policy:
 *  - Passwords come from DEV_SEED_*_PASSWORD env vars with dev-only defaults.
 *  - Passwords and hashes are never logged — only the account handles below.
 *  - The "Hira Anwar" fixture deliberately mirrors a Phase 6 fictional member
 *    username to demonstrate the AuthUser → memberProfileId → Member link;
 *    the persona itself remains fictional demo data.
 */

interface SeedUserSpec {
  username: string;
  email: string;
  displayName: string;
  role: "member" | "admin";
  password: string;
  memberProfileId?: string;
}

export async function seedDevelopmentUsers(): Promise<void> {
  const fixtures: SeedUserSpec[] = [
    {
      username: "demo-member",
      email: "demo-member@example.com",
      displayName: "Demo Member",
      role: "member",
      password: env.devSeedMemberPassword,
    },
    {
      // Fictional persona shared with the Phase 6 community dataset — the
      // account username matches the public member handle so the account
      // surface can link to /profile/hira-anwar.
      username: "hira-anwar",
      email: "hira.anwar@example.com",
      displayName: "Hira Anwar",
      role: "member",
      password: env.devSeedHiraPassword,
      memberProfileId: "mem-004",
    },
    {
      username: "scs-admin",
      email: "scs-admin@example.com",
      displayName: "SCS Admin (Demo)",
      role: "admin",
      password: env.devSeedAdminPassword,
    },
  ];

  for (const spec of fixtures) {
    const existing = await userRepository.findByUsername(spec.username);
    if (existing) continue;

    await userRepository.createUser({
      username: spec.username,
      email: spec.email,
      displayName: spec.displayName,
      role: spec.role,
      passwordHash: await hashPassword(spec.password),
      memberProfileId: spec.memberProfileId,
    });

    logger.info(
      `[auth-seed] dev fixture ready: ${spec.username} (${spec.role}) — development only`,
    );
  }
}
