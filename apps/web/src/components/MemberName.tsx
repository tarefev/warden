import type { MemberRef } from "@warden/shared";

export default function MemberName({ member }: { member: MemberRef | undefined }) {
  if (!member) return <span className="text-zinc-400">—</span>;

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {!!member.avatarUrl && <img src={member.avatarUrl} alt="" className="h-5 w-5 rounded-full" />}
      <span>{member.login}</span>
    </span>
  );
}
