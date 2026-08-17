export type NoticeKind = 'info' | 'error' | 'success';

export interface Notice {
  kind: NoticeKind;
  title: string;
  detail?: string;
}

interface NoticeBannerProps {
  notice: Notice;
  onDismiss: () => void;
}

export function NoticeBanner({ notice, onDismiss }: NoticeBannerProps) {
  return (
    <div className={`notice notice-${notice.kind}`} role="alert">
      <span className="notice-title">{notice.title}</span>
      {notice.detail ? <span className="notice-detail">{notice.detail}</span> : null}
      <button className="btn btn-small notice-close" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}