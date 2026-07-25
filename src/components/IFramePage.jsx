import { ExternalLink } from "lucide-react";

export function IFramePage({ url, title }) {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mx-3 md:-mx-6 -mb-6">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b text-xs text-muted-foreground shrink-0">
        <span className="truncate font-mono">{url}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> Open in new tab
        </a>
      </div>
      <iframe
        src={url}
        title={title || url}
        className="w-full flex-1 border-0"
        style={{ background: "#fff" }}
      />
    </div>
  );
}
