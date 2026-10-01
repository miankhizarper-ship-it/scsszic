import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { meService } from "@/services/meService";
import type { Member } from "@/types";

/**
 * Task 29 — hooks for the signed-in member's self-service surface
 * (/api/me/*). The profile query is disabled until the caller knows the
 * account is a society member (role "member"), so plain users never fire
 * a members-only request.
 */

/** The caller's own member directory record. */
export function useMyMemberProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["me", "member-profile"],
    queryFn: () => meService.getMemberProfile(),
    staleTime: 30_000,
    retry: false,
    enabled: options?.enabled ?? true,
  });
}

/**
 * PUT /api/me/member-profile — self-editable fields only. Invalidates the
 * member surfaces the edit touches: the self profile, the PUBLIC member
 * listing/detail (the public /profile/:username page shows these fields),
 * and the admin members CMS so an open admin tab reflects self-edits.
 */
export function useUpdateMyMemberProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof meService.updateMemberProfile>[0]) =>
      meService.updateMemberProfile(body),
    onSuccess: (member: Member) => {
      void queryClient.invalidateQueries({ queryKey: ["me", "member-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["members", "list"] });
      void queryClient.invalidateQueries({
        queryKey: ["members", "detail", member.username],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
  });
}

/**
 * POST /api/me/feed — publish a community post as the member. Invalidates
 * the public feed so the new post appears on /feed immediately, plus the
 * admin feed CMS and the audit trail (member posts are audited).
 */
export function useCreateMemberFeedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof meService.createFeedPost>[0]) =>
      meService.createFeedPost(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "feed"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}
