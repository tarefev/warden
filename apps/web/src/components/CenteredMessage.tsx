export default function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
      {text}
    </div>
  );
}
