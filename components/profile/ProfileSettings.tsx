import type { ProfileRow } from "@/types/media";
import {
  ProfileAvatarSettings,
  ProfileInfoSettings,
  ProfileSecuritySettings,
} from "./settings";

export interface ProfileSettingsProps {
  profile?: ProfileRow | null;
  userEmail?: string | null;
}

export function ProfileSettings({ profile, userEmail }: ProfileSettingsProps) {
  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <ProfileAvatarSettings profile={profile} />
      <ProfileInfoSettings profile={profile} userEmail={userEmail} />
      <ProfileSecuritySettings userEmail={userEmail} />
    </div>
  );
}
