-- What agents see about each other on My performance.
CREATE TYPE "LeaderboardMode" AS ENUM ('OFF', 'RANK_ONLY', 'TARGET_PERCENT', 'FULL');

ALTER TABLE "TenantSettings"
  ADD COLUMN "leaderboardMode" "LeaderboardMode" NOT NULL DEFAULT 'TARGET_PERCENT';

-- Workspaces that hid the leaderboard keep it hidden; the rest move from
-- full revenue figures to % of target, which reveals no money.
UPDATE "TenantSettings"
SET "leaderboardMode" = CASE WHEN "showLeaderboardToAgents" THEN 'TARGET_PERCENT'::"LeaderboardMode" ELSE 'OFF'::"LeaderboardMode" END;

ALTER TABLE "TenantSettings" DROP COLUMN "showLeaderboardToAgents";

-- Each person can appear as "A teammate" instead of by name.
ALTER TABLE "User" ADD COLUMN "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true;
