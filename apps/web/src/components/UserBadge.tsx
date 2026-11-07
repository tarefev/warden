import type { Me } from "@warden/shared";

export default function UserBadge({ me }: { me: Me }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      {!!me.avatarUrl && <img src={me.avatarUrl} alt="" className="h-6 w-6 rounded-full" />}
      <span>{me.login}</span>
    </span>
  );
}
